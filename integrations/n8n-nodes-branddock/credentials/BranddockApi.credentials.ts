import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Branddock workspace API-key credential.
 *
 * Create a key in Branddock under Settings → API & Connectors. The key is
 * workspace-scoped: every call runs against the brand DNA of that workspace.
 */
export class BranddockApi implements ICredentialType {
	name = 'branddockApi';

	displayName = 'Branddock API';

	documentationUrl = 'https://branddock.app/docs/api';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Workspace API key (bd_live_…) from Branddock Settings → API & Connectors. The key is shown only once at creation.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://app.branddock.app',
			description: 'Branddock instance base URL (no trailing slash)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1/brand-context',
		},
	};
}
