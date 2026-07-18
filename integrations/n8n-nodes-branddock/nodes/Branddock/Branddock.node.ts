import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

/** Splits "a, b, c" into a trimmed, non-empty string array. */
function parseIdList(value: string): string[] {
	return value
		.split(',')
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
}

/**
 * Builds the optional `contextSelection` body-object from the shared
 * "Context Selection" collection (persona/product/competitor/knowledge IDs).
 */
function buildContextSelection(raw: IDataObject): IDataObject | undefined {
	const selection: IDataObject = {};
	const mapping: Array<[string, string]> = [
		['personaIds', 'personaIds'],
		['productIds', 'productIds'],
		['competitorIds', 'competitorIds'],
		['knowledgeResourceIds', 'knowledgeResourceIds'],
	];
	for (const [param, field] of mapping) {
		const value = raw[param];
		if (typeof value === 'string' && value.trim() !== '') {
			selection[field] = parseIdList(value);
		}
	}
	return Object.keys(selection).length > 0 ? selection : undefined;
}

/**
 * Branddock — thin HTTP wrapper around the public Brand API (REST v1).
 *
 * Every operation mirrors one /api/v1/* endpoint 1:1; all request/response
 * shapes are owned by the API. Reading brand context and scoring are free;
 * generation operations consume workspace credits.
 */
export class Branddock implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Branddock',
		name: 'branddock',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Generate, rewrite and score on-brand content via the Branddock Brand API',
		defaults: {
			name: 'Branddock',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'branddockApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Get Brand Context',
						value: 'getBrandContext',
						action: 'Get the workspace brand context',
						description: 'Read the layered brand DNA of the workspace (free)',
					},
					{
						name: 'Score Content',
						value: 'scoreContent',
						action: 'Score content against the brand',
						description: 'Run an F-VAL brand-fidelity score on any text (free)',
					},
					{
						name: 'Generate Content',
						value: 'generateContent',
						action: 'Generate on brand content',
						description: 'Create a deliverable and generate on-brand content for it',
					},
					{
						name: 'Rewrite Content',
						value: 'rewriteContent',
						action: 'Rewrite content on brand',
						description: 'Ephemeral on-brand rewrite or reply — nothing is stored',
					},
					{
						name: 'Generate Web Page',
						value: 'generateWebPage',
						action: 'Generate an on brand web page',
						description: 'Generate a publishable web page (Puck) from a prompt',
					},
					{
						name: 'Start SEO Generation',
						value: 'startSeoGeneration',
						action: 'Start a long form SEO generation job',
						description: 'Kick off the async 8-step SEO/GEO long-form pipeline',
					},
					{
						name: 'Get SEO Status',
						value: 'getSeoStatus',
						action: 'Get the status of an SEO generation job',
						description: 'Poll the progress of a job started with Start SEO Generation',
					},
					{
						name: 'Start Campaign Strategy',
						value: 'startCampaignStrategy',
						action: 'Start a campaign strategy generation job',
						description: 'Kick off the async campaign-strategy chain',
					},
					{
						name: 'Get Strategy Status',
						value: 'getStrategyStatus',
						action: 'Get the status of a strategy generation job',
						description: 'Poll the progress of a job started with Start Campaign Strategy',
					},
					{
						name: 'Generate Video',
						value: 'generateVideo',
						action: 'Generate an on brand video clip',
						description: 'Generate a short on-brand video clip (waits for the provider)',
					},
				],
				default: 'getBrandContext',
			},

			// ── Score Content ────────────────────────────────────────────────
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				typeOptions: { rows: 6 },
				required: true,
				default: '',
				description: 'Text to score against the brand (minimum 50 characters)',
				displayOptions: { show: { operation: ['scoreContent'] } },
			},

			// ── Generate Content ─────────────────────────────────────────────
			{
				displayName: 'Content Type',
				name: 'contentType',
				type: 'string',
				required: true,
				default: 'linkedin-post',
				description: 'Content-type slug from the Branddock catalogus (e.g. "linkedin-post")',
				displayOptions: { show: { operation: ['generateContent'] } },
			},
			{
				displayName: 'Brief',
				name: 'brief',
				type: 'collection',
				placeholder: 'Add Brief Field',
				default: {},
				description: 'At least an objective or a key message is required to generate',
				displayOptions: { show: { operation: ['generateContent', 'startSeoGeneration'] } },
				options: [
					{ displayName: 'Objective', name: 'objective', type: 'string', default: '' },
					{ displayName: 'Key Message', name: 'keyMessage', type: 'string', default: '' },
					{ displayName: 'Tone Direction', name: 'toneDirection', type: 'string', default: '' },
					{ displayName: 'Call to Action', name: 'callToAction', type: 'string', default: '' },
				],
			},
			{
				displayName: 'Options',
				name: 'generateOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { operation: ['generateContent'] } },
				options: [
					{ displayName: 'Title', name: 'title', type: 'string', default: '' },
					{
						displayName: 'Campaign ID',
						name: 'campaignId',
						type: 'string',
						default: '',
						description: 'Existing campaign; when empty the "Quick Content" campaign is used',
					},
					{
						displayName: 'Generate Now',
						name: 'generate',
						type: 'boolean',
						default: true,
						description: 'Whether to generate immediately (false = only create the deliverable)',
					},
				],
			},

			// ── Rewrite Content ──────────────────────────────────────────────
			{
				displayName: 'Content',
				name: 'rewriteContent',
				type: 'string',
				typeOptions: { rows: 6 },
				required: true,
				default: '',
				description: 'Text to rewrite or reply to in brand voice (minimum 20 characters)',
				displayOptions: { show: { operation: ['rewriteContent'] } },
			},
			{
				displayName: 'Options',
				name: 'rewriteOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { operation: ['rewriteContent'] } },
				options: [
					{
						displayName: 'Intent',
						name: 'intent',
						type: 'options',
						options: [
							{ name: 'Rewrite', value: 'rewrite' },
							{ name: 'Reply', value: 'reply' },
						],
						default: 'rewrite',
					},
					{
						displayName: 'Instruction',
						name: 'instruction',
						type: 'string',
						default: '',
						description: 'Extra steering, e.g. "shorter and with a question at the end"',
					},
					{
						displayName: 'Persona IDs',
						name: 'personaIds',
						type: 'string',
						default: '',
						description: 'Comma-separated persona IDs to target',
					},
					{
						displayName: 'Product IDs',
						name: 'productIds',
						type: 'string',
						default: '',
						description: 'Comma-separated product IDs to reference',
					},
				],
			},

			// ── Generate Web Page ────────────────────────────────────────────
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				typeOptions: { rows: 4 },
				required: true,
				default: '',
				description: 'What the page should be about (minimum 5 characters)',
				displayOptions: { show: { operation: ['generateWebPage'] } },
			},
			{
				displayName: 'Options',
				name: 'webpageOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { operation: ['generateWebPage'] } },
				options: [
					{ displayName: 'Content Type', name: 'contentType', type: 'string', default: '' },
					{ displayName: 'Title', name: 'title', type: 'string', default: '' },
					{ displayName: 'Campaign ID', name: 'campaignId', type: 'string', default: '' },
					{
						displayName: 'Deliverable ID',
						name: 'deliverableId',
						type: 'string',
						default: '',
						description: 'Fill an existing web-page deliverable instead of creating a new one',
					},
				],
			},

			// ── Start SEO Generation ─────────────────────────────────────────
			{
				displayName: 'Primary Keyword',
				name: 'primaryKeyword',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { operation: ['startSeoGeneration'] } },
			},
			{
				displayName: 'Funnel Stage',
				name: 'funnelStage',
				type: 'options',
				options: [
					{ name: 'Awareness', value: 'awareness' },
					{ name: 'Consideration', value: 'consideration' },
					{ name: 'Decision', value: 'decision' },
				],
				default: 'awareness',
				displayOptions: { show: { operation: ['startSeoGeneration'] } },
			},
			{
				displayName: 'Options',
				name: 'seoOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { operation: ['startSeoGeneration'] } },
				options: [
					{
						displayName: 'Secondary Keyword Hints',
						name: 'secondaryKeywordHints',
						type: 'string',
						default: '',
						description: 'Comma-separated secondary keywords',
					},
					{
						displayName: 'Competitor URLs',
						name: 'competitorUrls',
						type: 'string',
						default: '',
						description: 'Comma-separated competitor URLs to analyse',
					},
					{ displayName: 'Conversion Goal', name: 'conversionGoal', type: 'string', default: '' },
					{ displayName: 'Traffic Source', name: 'trafficSource', type: 'string', default: '' },
					{ displayName: 'Content Type', name: 'contentType', type: 'string', default: '' },
					{ displayName: 'Title', name: 'title', type: 'string', default: '' },
					{ displayName: 'Campaign ID', name: 'campaignId', type: 'string', default: '' },
					{
						displayName: 'Deliverable ID',
						name: 'deliverableId',
						type: 'string',
						default: '',
						description: 'Fill an existing deliverable instead of creating a new one',
					},
				],
			},

			// ── Get SEO Status ───────────────────────────────────────────────
			{
				displayName: 'Job ID',
				name: 'jobId',
				type: 'string',
				required: true,
				default: '',
				description: 'Job ID returned by Start SEO Generation',
				displayOptions: { show: { operation: ['getSeoStatus'] } },
			},

			// ── Start Campaign Strategy ──────────────────────────────────────
			{
				displayName: 'Briefing',
				name: 'briefing',
				type: 'string',
				typeOptions: { rows: 6 },
				required: true,
				default: '',
				description: 'Campaign briefing (minimum 30 characters)',
				displayOptions: { show: { operation: ['startCampaignStrategy'] } },
			},
			{
				displayName: 'Campaign Goal Type',
				name: 'campaignGoalType',
				type: 'string',
				required: true,
				default: '',
				description: 'Goal-type identifier as used in the Branddock campaign wizard',
				displayOptions: { show: { operation: ['startCampaignStrategy'] } },
			},
			{
				displayName: 'Options',
				name: 'strategyOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { operation: ['startCampaignStrategy'] } },
				options: [
					{ displayName: 'Campaign Title', name: 'campaignTitle', type: 'string', default: '' },
					{
						displayName: 'Campaign ID',
						name: 'campaignId',
						type: 'string',
						default: '',
						description: 'Attach the strategy to an existing campaign',
					},
					{
						displayName: 'Persona IDs',
						name: 'personaIds',
						type: 'string',
						default: '',
						description: 'Comma-separated persona IDs',
					},
					{
						displayName: 'Product IDs',
						name: 'productIds',
						type: 'string',
						default: '',
						description: 'Comma-separated product IDs',
					},
					{
						displayName: 'Competitor IDs',
						name: 'competitorIds',
						type: 'string',
						default: '',
						description: 'Comma-separated competitor IDs',
					},
					{
						displayName: 'Mode',
						name: 'mode',
						type: 'options',
						options: [
							{ name: 'Quick', value: 'quick' },
							{ name: 'Full', value: 'full' },
						],
						default: 'full',
					},
					{
						displayName: 'Create Deliverables',
						name: 'createDeliverables',
						type: 'boolean',
						default: false,
						description: 'Whether to create the planned deliverables when the strategy completes',
					},
				],
			},

			// ── Get Strategy Status ──────────────────────────────────────────
			{
				displayName: 'Campaign ID',
				name: 'statusCampaignId',
				type: 'string',
				required: true,
				default: '',
				description: 'Campaign ID returned by Start Campaign Strategy',
				displayOptions: { show: { operation: ['getStrategyStatus'] } },
			},

			// ── Generate Video ───────────────────────────────────────────────
			{
				displayName: 'Script Text',
				name: 'scriptText',
				type: 'string',
				typeOptions: { rows: 4 },
				required: true,
				default: '',
				description: 'Script or scene description for the clip (max 5000 characters)',
				displayOptions: { show: { operation: ['generateVideo'] } },
			},
			{
				displayName: 'Provider',
				name: 'provider',
				type: 'string',
				required: true,
				default: '',
				description: 'Video provider ID as configured in Branddock (e.g. Kling/Veo/Seedance/LTX)',
				displayOptions: { show: { operation: ['generateVideo'] } },
			},
			{
				displayName: 'Options',
				name: 'videoOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { operation: ['generateVideo'] } },
				options: [
					{
						displayName: 'Duration (Seconds)',
						name: 'duration',
						type: 'number',
						typeOptions: { minValue: 3, maxValue: 15 },
						default: 5,
					},
					{ displayName: 'Aspect Ratio', name: 'aspectRatio', type: 'string', default: '9:16' },
					{ displayName: 'Source Image URL', name: 'sourceImageUrl', type: 'string', default: '' },
					{ displayName: 'Motion Prompt', name: 'motionPrompt', type: 'string', default: '' },
					{
						displayName: 'Scene',
						name: 'sceneId',
						type: 'options',
						options: [
							{ name: 'Full', value: 'full' },
							{ name: 'Hook', value: 'hook' },
							{ name: 'Body', value: 'body' },
							{ name: 'CTA', value: 'cta' },
						],
						default: 'full',
					},
					{ displayName: 'Title', name: 'title', type: 'string', default: '' },
					{ displayName: 'Content Type', name: 'contentType', type: 'string', default: '' },
					{ displayName: 'Campaign ID', name: 'campaignId', type: 'string', default: '' },
					{
						displayName: 'Deliverable ID',
						name: 'deliverableId',
						type: 'string',
						default: '',
						description: 'Attach the clip to an existing deliverable',
					},
				],
			},

			// ── Shared: context selection ────────────────────────────────────
			{
				displayName: 'Context Selection',
				name: 'contextSelection',
				type: 'collection',
				placeholder: 'Add Context',
				default: {},
				description: 'Which brand knowledge to inject (the knowledge toggles of the Canvas)',
				displayOptions: {
					show: { operation: ['generateContent', 'generateWebPage', 'startSeoGeneration'] },
				},
				options: [
					{
						displayName: 'Persona IDs',
						name: 'personaIds',
						type: 'string',
						default: '',
						description: 'Comma-separated persona IDs',
					},
					{
						displayName: 'Product IDs',
						name: 'productIds',
						type: 'string',
						default: '',
						description: 'Comma-separated product IDs',
					},
					{
						displayName: 'Competitor IDs',
						name: 'competitorIds',
						type: 'string',
						default: '',
						description: 'Comma-separated competitor IDs',
					},
					{
						displayName: 'Knowledge Resource IDs',
						name: 'knowledgeResourceIds',
						type: 'string',
						default: '',
						description: 'Comma-separated knowledge-resource IDs',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('branddockApi');
		const baseUrl = String(credentials.baseUrl ?? 'https://app.branddock.app').replace(/\/$/, '');

		const request = async (
			method: IHttpRequestMethods,
			path: string,
			body?: IDataObject,
			qs?: IDataObject,
		): Promise<IDataObject> => {
			return (await this.helpers.httpRequestWithAuthentication.call(this, 'branddockApi', {
				method,
				url: `${baseUrl}${path}`,
				...(body ? { body } : {}),
				...(qs ? { qs } : {}),
				json: true,
			})) as IDataObject;
		};

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;
			try {
				let response: IDataObject;

				switch (operation) {
					case 'getBrandContext': {
						response = await request('GET', '/api/v1/brand-context');
						break;
					}

					case 'scoreContent': {
						response = await request('POST', '/api/v1/score', {
							content: this.getNodeParameter('content', i) as string,
						});
						break;
					}

					case 'generateContent': {
						const brief = this.getNodeParameter('brief', i, {}) as IDataObject;
						const options = this.getNodeParameter('generateOptions', i, {}) as IDataObject;
						const contextSelection = buildContextSelection(
							this.getNodeParameter('contextSelection', i, {}) as IDataObject,
						);
						const body: IDataObject = {
							contentType: this.getNodeParameter('contentType', i) as string,
							brief,
						};
						if (typeof options.title === 'string' && options.title !== '') body.title = options.title;
						if (typeof options.campaignId === 'string' && options.campaignId !== '') {
							body.campaignId = options.campaignId;
						}
						if (options.generate === false) body.generate = false;
						if (contextSelection) body.contextSelection = contextSelection;
						response = await request('POST', '/api/v1/generate', body);
						break;
					}

					case 'rewriteContent': {
						const options = this.getNodeParameter('rewriteOptions', i, {}) as IDataObject;
						const body: IDataObject = {
							content: this.getNodeParameter('rewriteContent', i) as string,
						};
						if (typeof options.intent === 'string' && options.intent !== '') body.intent = options.intent;
						if (typeof options.instruction === 'string' && options.instruction !== '') {
							body.instruction = options.instruction;
						}
						if (typeof options.personaIds === 'string' && options.personaIds.trim() !== '') {
							body.personaIds = parseIdList(options.personaIds);
						}
						if (typeof options.productIds === 'string' && options.productIds.trim() !== '') {
							body.productIds = parseIdList(options.productIds);
						}
						response = await request('POST', '/api/v1/rewrite', body);
						break;
					}

					case 'generateWebPage': {
						const options = this.getNodeParameter('webpageOptions', i, {}) as IDataObject;
						const contextSelection = buildContextSelection(
							this.getNodeParameter('contextSelection', i, {}) as IDataObject,
						);
						const body: IDataObject = {
							prompt: this.getNodeParameter('prompt', i) as string,
						};
						for (const field of ['contentType', 'title', 'campaignId', 'deliverableId']) {
							const value = options[field];
							if (typeof value === 'string' && value !== '') body[field] = value;
						}
						if (contextSelection) body.contextSelection = contextSelection;
						response = await request('POST', '/api/v1/webpage-generate', body);
						break;
					}

					case 'startSeoGeneration': {
						const brief = this.getNodeParameter('brief', i, {}) as IDataObject;
						const options = this.getNodeParameter('seoOptions', i, {}) as IDataObject;
						const contextSelection = buildContextSelection(
							this.getNodeParameter('contextSelection', i, {}) as IDataObject,
						);
						const seoInput: IDataObject = {
							primaryKeyword: this.getNodeParameter('primaryKeyword', i) as string,
							funnelStage: this.getNodeParameter('funnelStage', i) as string,
						};
						if (typeof options.secondaryKeywordHints === 'string' && options.secondaryKeywordHints.trim() !== '') {
							seoInput.secondaryKeywordHints = parseIdList(options.secondaryKeywordHints);
						}
						if (typeof options.competitorUrls === 'string' && options.competitorUrls.trim() !== '') {
							seoInput.competitorUrls = parseIdList(options.competitorUrls);
						}
						for (const field of ['conversionGoal', 'trafficSource']) {
							const value = options[field];
							if (typeof value === 'string' && value !== '') seoInput[field] = value;
						}
						const body: IDataObject = { seoInput };
						for (const field of ['contentType', 'title', 'campaignId', 'deliverableId']) {
							const value = options[field];
							if (typeof value === 'string' && value !== '') body[field] = value;
						}
						if (Object.keys(brief).length > 0) body.brief = brief;
						if (contextSelection) body.contextSelection = contextSelection;
						response = await request('POST', '/api/v1/seo-generate', body);
						break;
					}

					case 'getSeoStatus': {
						response = await request('GET', '/api/v1/seo-status', undefined, {
							jobId: this.getNodeParameter('jobId', i) as string,
						});
						break;
					}

					case 'startCampaignStrategy': {
						const options = this.getNodeParameter('strategyOptions', i, {}) as IDataObject;
						const body: IDataObject = {
							briefing: this.getNodeParameter('briefing', i) as string,
							campaignGoalType: this.getNodeParameter('campaignGoalType', i) as string,
						};
						for (const field of ['campaignTitle', 'campaignId', 'mode']) {
							const value = options[field];
							if (typeof value === 'string' && value !== '') body[field] = value;
						}
						for (const field of ['personaIds', 'productIds', 'competitorIds']) {
							const value = options[field];
							if (typeof value === 'string' && value.trim() !== '') body[field] = parseIdList(value);
						}
						if (typeof options.createDeliverables === 'boolean') {
							body.createDeliverables = options.createDeliverables;
						}
						response = await request('POST', '/api/v1/strategy-generate', body);
						break;
					}

					case 'getStrategyStatus': {
						response = await request('GET', '/api/v1/strategy-status', undefined, {
							campaignId: this.getNodeParameter('statusCampaignId', i) as string,
						});
						break;
					}

					case 'generateVideo': {
						const options = this.getNodeParameter('videoOptions', i, {}) as IDataObject;
						const body: IDataObject = {
							scriptText: this.getNodeParameter('scriptText', i) as string,
							provider: this.getNodeParameter('provider', i) as string,
						};
						if (typeof options.duration === 'number') body.duration = options.duration;
						for (const field of [
							'aspectRatio',
							'sourceImageUrl',
							'motionPrompt',
							'sceneId',
							'title',
							'contentType',
							'campaignId',
							'deliverableId',
						]) {
							const value = options[field];
							if (typeof value === 'string' && value !== '') body[field] = value;
						}
						response = await request('POST', '/api/v1/video-generate', body);
						break;
					}

					default:
						throw new NodeOperationError(this.getNode(), `Unknown operation "${operation}"`, {
							itemIndex: i,
						});
				}

				returnData.push({ json: response, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error instanceof Error ? error.message : String(error) },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
