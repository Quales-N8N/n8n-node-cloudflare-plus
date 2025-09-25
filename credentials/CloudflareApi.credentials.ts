import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CloudflareApi implements ICredentialType {
	name = 'cloudflareApi';
	displayName = 'Cloudflare API';
	documentationUrl = 'https://developers.cloudflare.com/fundamentals/api/get-started/';

	properties: INodeProperties[] = [
		{
			displayName: 'Authentication',
			name: 'authType',
			type: 'options',
			default: 'apiToken',
			options: [
				{ name: 'API Token', value: 'apiToken' },
				{ name: 'API Key + Email (Legacy)', value: 'apiKey' },
			],
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			default: '',
			typeOptions: { password: true },
			displayOptions: {
				show: {
					authType: ['apiToken'],
				},
			},
		},
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					authType: ['apiKey'],
				},
			},
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			typeOptions: { password: true },
			displayOptions: {
				show: {
					authType: ['apiKey'],
				},
			},
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				// Use API token if provided, else legacy key + email
				Authorization:
					'={{ $credentials.authType === "apiToken" ? ("Bearer " + $credentials.apiToken) : undefined }}',
				'X-Auth-Key': '={{ $credentials.authType === "apiKey" ? $credentials.apiKey : undefined }}',
				'X-Auth-Email':
					'={{ $credentials.authType === "apiKey" ? $credentials.email : undefined }}',
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.cloudflare.com/client/v4',
			url: '/user/tokens/verify',
			method: 'GET',
		},
	};
}
