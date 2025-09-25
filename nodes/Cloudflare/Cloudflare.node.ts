/* eslint-disable n8n-nodes-base/node-param-operation-option-without-action,n8n-nodes-base/node-param-options-type-unsorted-items,n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options */
import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';
import { collectAllPaginated, requestWithRetry } from './utils';

type CloudflareResource = 'zone' | 'dnsRecord' | 'firewallRule' | 'cache';
type Operation = 'list' | 'get' | 'create' | 'update' | 'delete' | 'purge';

export class Cloudflare implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cloudflare+',
		name: 'cloudflare',
		icon: 'file:cloudflare.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Cloudflare REST API',
		defaults: {
			name: 'Cloudflare+',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'cloudflareApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://api.cloudflare.com/client/v4',
			url: '',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Zone', value: 'zone' },
					{ name: 'DNS Record', value: 'dnsRecord' },
					{ name: 'Firewall Rule', value: 'firewallRule' },
					{ name: 'Cache', value: 'cache' },
				],
				default: 'zone',
			},

			// --------------------
			// Zone operations
			// --------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['zone'],
					},
				},
				options: [
					{ name: 'List', value: 'list', description: 'List zones' },
					{ name: 'Get', value: 'get', description: 'Get zone details' },
					{ name: 'Create', value: 'create', description: 'Create a zone' },
					{ name: 'Update', value: 'update', description: 'Update a zone' },
					{ name: 'Delete', value: 'delete', description: 'Delete a zone' },
				],
				default: 'list',
			},

			// --------------------
			// DNS Record operations
			// --------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['dnsRecord'],
					},
				},
				options: [
					{ name: 'List', value: 'list', description: 'List DNS records' },
					{ name: 'Get', value: 'get', description: 'Get DNS record details' },
					{ name: 'Create', value: 'create', description: 'Create a DNS record' },
					{ name: 'Update', value: 'update', description: 'Update a DNS record' },
					{ name: 'Delete', value: 'delete', description: 'Delete a DNS record' },
				],
				default: 'list',
			},

			// --------------------
			// Cache operations
			// --------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['cache'],
					},
				},
				options: [{ name: 'Purge', value: 'purge', description: 'Purge cache' }],
				default: 'purge',
			},

			{
				displayName: 'Zone ID',
				name: 'zoneId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getZones' },
				default: '',

				displayOptions: {
					show: {
						resource: ['zone'],
						operation: ['get', 'update', 'delete'],
					},
				},
			},

			{
				displayName: 'Zone ID',
				name: 'zoneId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getZones' },
				default: '',

				displayOptions: {
					show: {
						resource: ['dnsRecord'],
						operation: ['list', 'create', 'get', 'update', 'delete'],
					},
				},
			},

			{
				displayName: 'Zone Name',
				name: 'zoneName',
				type: 'string',
				description:
					'Enter the name of the zone to create, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				default: '',
				displayOptions: {
					show: {
						resource: ['zone'],
						operation: ['create'],
					},
				},
			},

			// DNS record specific
			{
				displayName: 'DNS Record ID',
				name: 'dnsRecordId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getDnsRecords' },
				default: '',

				displayOptions: {
					show: {
						resource: ['dnsRecord'],
						operation: ['get', 'update', 'delete'],
					},
				},
			},

			// Create/Update
			{
				displayName: 'Zone Type',
				name: 'zoneType',
				type: 'options',
				options: [{ name: 'Full', value: 'full' }],
				default: 'full',
				displayOptions: {
					show: {
						resource: ['zone'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Account ID',
				name: 'accountId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getAccounts' },
				default: '',
				displayOptions: {
					show: {
						resource: ['zone'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Record Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'A', value: 'A' },
					{ name: 'AAAA', value: 'AAAA' },
					{ name: 'CNAME', value: 'CNAME' },
					{ name: 'TXT', value: 'TXT' },
					{ name: 'MX', value: 'MX' },
					{ name: 'NS', value: 'NS' },
					{ name: 'SRV', value: 'SRV' },
				],
				default: 'A',
				displayOptions: {
					show: {
						resource: ['dnsRecord'],
						operation: ['create', 'update'],
					},
				},
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['dnsRecord'],
						operation: ['create', 'update'],
					},
				},
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['dnsRecord'],
						operation: ['create', 'update'],
					},
				},
			},
			{
				displayName: 'TTL',
				name: 'ttl',
				type: 'number',
				default: 1,
				description: '1 is Auto, else seconds',
				displayOptions: {
					show: {
						resource: ['dnsRecord'],
						operation: ['create', 'update'],
					},
				},
			},

			// Pagination controls
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				description: 'Whether to return all results or only up to a given limit',
				default: false,
				displayOptions: {
					show: {
						operation: ['list'],
					},
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				// eslint-disable-next-line n8n-nodes-base/node-param-type-options-max-value-present
				typeOptions: { minValue: 1, maxValue: 10000 },
				// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-limit
				default: 100,
				description: 'Max number of results to return',
				displayOptions: {
					show: {
						operation: ['list'],
						returnAll: [false],
					},
				},
			},
		],
	};
	methods = {
		loadOptions: {
			async getZones(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const items = await collectAllPaginated(async (page, perPage) => {
					const res = await requestWithRetry(this, {
						method: 'GET',
						url: '/zones',
						qs: { page, per_page: perPage },
					});
					return {
						items: (res.result || []) as Array<{ id: string; name: string }>,
						total: res.result_info?.total_count,
					};
				});
				return items.map((z) => ({ name: z.name, value: z.id }));
			},

			async getAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const items = await collectAllPaginated(async (page, perPage) => {
					const res = await requestWithRetry(this, {
						method: 'GET',
						url: '/accounts',
						qs: { page, per_page: perPage },
					});
					return {
						items: (res.result || []) as Array<{ id: string; name: string }>,
						total: res.result_info?.total_count,
					};
				});
				return items.map((a) => ({ name: a.name, value: a.id }));
			},

			async getDnsRecords(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const zoneId = this.getCurrentNodeParameter('zoneId') as string;
				if (!zoneId) return [];
				const items = await collectAllPaginated(async (page, perPage) => {
					const res = await requestWithRetry(this, {
						method: 'GET',
						url: `/zones/${zoneId}/dns_records`,
						qs: { page, per_page: perPage },
					});
					return {
						items: (res.result || []) as Array<{ id: string; name: string; type: string }>,
						total: res.result_info?.total_count,
					};
				});
				return items.map((r) => ({ name: `${r.name} (${r.type})`, value: r.id }));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const resource = this.getNodeParameter('resource', i) as CloudflareResource;
			const operation = this.getNodeParameter('operation', i) as Operation;
			try {
				let responseData: any;

				if (resource === 'zone') {
					if (operation === 'list') {
						const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
						if (returnAll) {
							const collected = await collectAllPaginated(async (page, perPage) => {
								const res = await requestWithRetry(this, {
									method: 'GET',
									url: '/zones',
									qs: { page, per_page: perPage },
								});
								return {
									items: res.result || [],
									total: res.result_info?.total_count,
								};
							});
							responseData = collected;
						} else {
							const limit = this.getNodeParameter('limit', i, 100) as number;
							const collected = await collectAllPaginated(async (page, perPage) => {
								const res = await requestWithRetry(this, {
									method: 'GET',
									url: '/zones',
									qs: { page, per_page: perPage },
								});
								return {
									items: res.result || [],
									total: res.result_info?.total_count,
								};
							}, limit);
							responseData = collected;
						}
					} else if (operation === 'get') {
						const zoneId = this.getNodeParameter('zoneId', i) as string;
						responseData = await requestWithRetry(this, {
							method: 'GET',
							url: `/zones/${zoneId}`,
						});
						responseData = responseData.result;
					} else if (operation === 'delete') {
						const zoneId = this.getNodeParameter('zoneId', i) as string;
						responseData = await requestWithRetry(this, {
							method: 'DELETE',
							url: `/zones/${zoneId}`,
						});
					} else if (operation === 'create') {
						const body = {
							account: {
								id: this.getNodeParameter('accountId', i),
							},
							name: this.getNodeParameter('zoneName', i),
						};
						responseData = await requestWithRetry(this, {
							method: 'POST',
							url: `/zones`,
							body,
						});
					}
				}

				if (resource === 'dnsRecord') {
					const zoneId = this.getNodeParameter('zoneId', i) as string;
					if (!zoneId)
						throw new NodeOperationError(this.getNode(), 'Zone is required', { itemIndex: i });
					if (operation === 'list') {
						const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
						const collect = async (limit?: number) =>
							await collectAllPaginated(async (page, perPage) => {
								const res = await requestWithRetry(this, {
									method: 'GET',
									url: `/zones/${zoneId}/dns_records`,
									qs: { page, per_page: perPage },
								});
								return {
									items: res.result || [],
									total: res.result_info?.total_count,
								};
							}, limit);
						responseData = returnAll
							? await collect()
							: await collect(this.getNodeParameter('limit', i, 100) as number);
					} else if (operation === 'create') {
						const body = {
							type: this.getNodeParameter('type', i),
							name: this.getNodeParameter('name', i),
							content: this.getNodeParameter('content', i),
							ttl: this.getNodeParameter('ttl', i),
						}
						const res = await requestWithRetry(this, {
							method: 'POST',
							url: `/zones/${zoneId}/dns_records`,
							body,
						});
						responseData = res.result;
					} else if (operation === 'update') {
						const dnsRecordId = this.getNodeParameter('dnsRecordId', i) as string;
						const body = {
							type: this.getNodeParameter('type', i),
							name: this.getNodeParameter('name', i),
							content: this.getNodeParameter('content', i),
							ttl: this.getNodeParameter('ttl', i),
						} as Record<string, unknown>;
						const res = await requestWithRetry(this, {
							method: 'PUT',
							url: `/zones/${zoneId}/dns_records/${dnsRecordId}`,
							body,
						});
						responseData = res.result;
					} else if (operation === 'get') {
						const dnsRecordId = this.getNodeParameter('dnsRecordId', i) as string;
						const res = await requestWithRetry(this, {
							method: 'GET',
							url: `/zones/${zoneId}/dns_records/${dnsRecordId}`,
						});
						responseData = res.result;
					} else if (operation === 'delete') {
						const dnsRecordId = this.getNodeParameter('dnsRecordId', i) as string;
						responseData = await requestWithRetry(this, {
							method: 'DELETE',
							url: `/zones/${zoneId}/dns_records/${dnsRecordId}`,
						});
					}
				}

				if (resource === 'cache' && operation === 'purge') {
					const zoneId = this.getNodeParameter('zoneId', i) as string;
					const res = await requestWithRetry(this, {
						method: 'POST',
						url: `/zones/${zoneId}/purge_cache`,
						body: { purge_everything: true },
					});
					responseData = res;
				}

				returnData.push({
					json: Array.isArray(responseData) ? { data: responseData } : responseData,
				});
			} catch (error: any) {
				console.log(error);
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message, details: error.description || error },
						pairedItem: i,
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
