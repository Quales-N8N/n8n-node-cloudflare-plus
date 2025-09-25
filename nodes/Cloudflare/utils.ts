import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { setTimeout as sleep } from 'timers/promises';
import { IHttpRequestMethods } from 'n8n-workflow/dist/esm/interfaces';

type Ctx = IExecuteFunctions | ILoadOptionsFunctions;

export interface RequestOptions {
	method: IHttpRequestMethods;
	url: string;
	qs?: Record<string, any>;
	body?: any;
}

export async function requestWithRetry(
	ctx: Ctx,
	opts: RequestOptions,
	maxRetries = 5,
): Promise<any> {
	let attempt = 0;
	let waitMs = 1000;
	while (true) {
		try {
			// Build headers explicitly from credentials to avoid undefined header injection
			const creds = await (ctx as any).getCredentials('cloudflareApi');
			const headers: Record<string, string> = { Accept: 'application/json' };
			if (creds?.authType === 'apiToken' && creds?.apiToken) {
				headers['Authorization'] = `Bearer ${creds.apiToken}`;
			} else if (creds?.authType === 'apiKey' && creds?.apiKey && creds?.email) {
				headers['X-Auth-Key'] = String(creds.apiKey);
				headers['X-Auth-Email'] = String(creds.email);
			}
			if (typeof opts.body !== 'undefined') headers['Content-Type'] = 'application/json';

			const requestOptions: any = {
				method: opts.method,
				url: 'https://api.cloudflare.com/client/v4' + opts.url,
				qs: opts.qs,
				returnFullResponse: true,
				json: true,
				headers,
			};
			if (typeof opts.body !== 'undefined') requestOptions.body = opts.body;

			const response = await (ctx as IExecuteFunctions).helpers.httpRequest.call(
				ctx,
				requestOptions,
			);
			const status = response.statusCode as number;
			if (status >= 200 && status < 300) {
				return response.body;
			}
			// Handle Cloudflare errors consistently
			const retryAfterHeader = response.headers?.['retry-after'];
			if (status === 429 || status === 503) {
				if (attempt >= maxRetries) throw toCloudflareError(response.body, status);
				const retryAfter = retryAfterHeader
					? parseInt(String(retryAfterHeader), 10) * 1000
					: waitMs;
				await sleep(Math.max(retryAfter, waitMs));
				attempt++;
				waitMs *= 2;
				continue;
			}
			throw toCloudflareError(response.body, status);
		} catch (err: any) {
			// Network or thrown error
			if (err?.response) {
				const status = err.response.statusCode || err.response.status;
				if ((status === 429 || status === 503) && attempt < maxRetries) {
					const retryAfterHeader = err.response.headers?.['retry-after'];
					const retryAfter = retryAfterHeader
						? parseInt(String(retryAfterHeader), 10) * 1000
						: waitMs;
					await sleep(Math.max(retryAfter, waitMs));
					attempt++;
					waitMs *= 2;
					continue;
				}
				throw toCloudflareError(err.response.body || err.response.data, status);
			}
			throw err;
		}
	}
}

export async function collectAllPaginated<T extends { id?: string }>(
	pageFetcher: (page: number, perPage: number) => Promise<{ items: T[]; total?: number }>,
	limit?: number,
): Promise<T[]> {
	const perPage = 50;
	let page = 1;
	const out: T[] = [];
	while (true) {
		const { items } = await pageFetcher(page, perPage);
		if (!items || items.length === 0) break;
		for (const it of items) {
			out.push(it);
			if (limit && out.length >= limit) return out.slice(0, limit);
		}
		if (items.length < perPage) break;
		page += 1;
	}
	return out;
}

export function toCloudflareError(body: any, status?: number) {
	const errors = body?.errors || body?.messages || body;
	const message =
		Array.isArray(errors) && errors.length > 0
			? errors.map((e: any) => e.message || JSON.stringify(e)).join('; ')
			: typeof errors === 'string'
				? errors
				: 'Cloudflare API error';
	const err: any = new Error(`${message}${status ? ` (HTTP ${status})` : ''}`);
	err.description = body;
	return err;
}
