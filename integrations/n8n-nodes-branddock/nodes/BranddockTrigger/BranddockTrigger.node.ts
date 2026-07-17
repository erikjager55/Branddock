import { createHmac, timingSafeEqual } from 'crypto';

import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

/**
 * Verifies the `x-branddock-signature: sha256=<hmac-hex>` header against the
 * raw request body using the endpoint's shared secret (whsec_…).
 */
function isSignatureValid(rawBody: Buffer, signatureHeader: string, secret: string): boolean {
	const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
	const a = Buffer.from(signatureHeader, 'utf8');
	const b = Buffer.from(expected, 'utf8');
	return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Branddock Trigger — receives outbound Branddock webhooks.
 *
 * Register the production webhook URL of this node as an endpoint in
 * Branddock (Settings → API & Connectors → Webhooks) and subscribe it to the
 * events you want. Payloads are metadata-only (IDs, scores, types — never
 * content text); fetch details with the Branddock node using the entity ID.
 */
export class BranddockTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Branddock Trigger',
		name: 'branddockTrigger',
		group: ['trigger'],
		version: 1,
		description: 'Starts a workflow on Branddock webhook events',
		defaults: {
			name: 'Branddock Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{
						name: 'Content Published',
						value: 'content.published',
						description: 'A deliverable was published',
					},
					{
						name: 'Fidelity Scored',
						value: 'fidelity.scored',
						description: 'An F-VAL brand-fidelity score completed',
					},
					{
						name: 'Fidelity Below Threshold',
						value: 'fidelity.below_threshold',
						description: 'A fidelity score came in below the workspace threshold',
					},
					{
						name: 'Deliverable Generated',
						value: 'deliverable.generated',
						description: 'A headless content generation completed successfully',
					},
				],
				default: ['content.published', 'fidelity.scored', 'fidelity.below_threshold', 'deliverable.generated'],
				description: 'Only these event types start the workflow; others are acknowledged and ignored',
			},
			{
				displayName: 'Webhook Secret',
				name: 'secret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description:
					'The whsec_… secret shown once when the endpoint was created in Branddock. When set, the x-branddock-signature HMAC of every delivery is verified and invalid deliveries are rejected with 401.',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const res = this.getResponseObject();
		const body = this.getBodyData() as IDataObject;
		const headers = this.getHeaderData() as IDataObject;

		const secret = this.getNodeParameter('secret', '') as string;
		if (secret !== '') {
			const signatureHeader = String(headers['x-branddock-signature'] ?? '');
			// n8n exposes the unparsed payload as `rawBody`; the HMAC is computed
			// over those exact bytes. Re-stringifying is a best-effort fallback
			// only (key order usually survives a JSON round-trip, but is not
			// guaranteed — prefer n8n versions that provide rawBody).
			const rawBody =
				(req as unknown as { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(body), 'utf8');
			if (signatureHeader === '' || !isSignatureValid(rawBody, signatureHeader, secret)) {
				res.status(401).json({ error: 'Invalid signature' });
				return { noWebhookResponse: true };
			}
		}

		const subscribed = this.getNodeParameter('events', []) as string[];
		const eventType = String(body.event ?? headers['x-branddock-event'] ?? '');
		if (subscribed.length > 0 && !subscribed.includes(eventType)) {
			// Acknowledge but do not start the workflow — the Branddock endpoint
			// may be subscribed to more events than this particular workflow.
			res.status(200).json({ ignored: true });
			return { noWebhookResponse: true };
		}

		return {
			workflowData: [this.helpers.returnJsonArray([body])],
		};
	}
}
