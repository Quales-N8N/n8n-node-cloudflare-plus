import { describe, it, expect, vi } from 'vitest';
import { requestWithRetry } from '../nodes/Cloudflare/utils';

function makeCtx(sequence: Array<{ statusCode: number; body?: any; headers?: Record<string, any> }>) {
  let callIndex = 0;
  const helpers = {
    httpRequestWithAuthentication: vi.fn(async (_credName: string, _opts: any) => {
      const current = sequence[Math.min(callIndex, sequence.length - 1)];
      callIndex++;
      if (current.statusCode >= 200 && current.statusCode < 300) {
        return { statusCode: current.statusCode, body: current.body ?? {}, headers: current.headers ?? {} } as any;
      }
      // Simulate throw with response on non-2xx
      const error: any = new Error('HTTP Error');
      error.response = {
        statusCode: current.statusCode,
        body: current.body ?? {},
        headers: current.headers ?? {},
      };
      throw error;
    }),
  } as any;
  return { helpers } as any;
}

describe('requestWithRetry', () => {
  it('retries on 429 then succeeds', async () => {
    const ctx = makeCtx([
      { statusCode: 429, headers: { 'retry-after': '0' }, body: { errors: [{ message: 'rate limited' }] } },
      { statusCode: 200, body: { ok: true } },
    ]);
    const res = await requestWithRetry(ctx as any, { method: 'GET', url: '/zones' }, 2);
    expect(res.ok).toBe(true);
  });

  it('fails after max retries', async () => {
    const ctx = makeCtx([
      { statusCode: 429, headers: { 'retry-after': '0' }, body: { errors: [{ message: 'rate limited' }] } },
      { statusCode: 429, headers: { 'retry-after': '0' }, body: { errors: [{ message: 'rate limited again' }] } },
      { statusCode: 429, headers: { 'retry-after': '0' }, body: { errors: [{ message: 'still limited' }] } },
    ]);
    await expect(
      requestWithRetry(ctx as any, { method: 'GET', url: '/zones' }, 2),
    ).rejects.toThrow(/Cloudflare API error|rate limited/);
  });
});


