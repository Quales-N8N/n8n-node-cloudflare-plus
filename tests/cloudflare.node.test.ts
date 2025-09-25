import { describe, it, expect, vi } from 'vitest';

import { collectAllPaginated, toCloudflareError } from '../nodes/Cloudflare/utils';

describe('collectAllPaginated', () => {
  it('collects all pages until empty', async () => {
    const data = [1,2,3,4,5,6,7,8,9,10].map((n) => ({ id: String(n) }));
    const pageFetcher = vi.fn(async (page: number, perPage: number) => {
      const start = (page - 1) * perPage;
      const slice = data.slice(start, start + perPage);
      return { items: slice };
    });
    const all = await collectAllPaginated(pageFetcher as any);
    expect(all.length).toBe(10);
  });

  it('respects limit', async () => {
    const data = Array.from({ length: 100 }, (_, i) => ({ id: String(i) }));
    const pageFetcher = vi.fn(async (page: number, perPage: number) => {
      const start = (page - 1) * perPage;
      const slice = data.slice(start, start + perPage);
      return { items: slice };
    });
    const limited = await collectAllPaginated(pageFetcher as any, 35);
    expect(limited.length).toBe(35);
  });
});

describe('toCloudflareError', () => {
  it('includes messages from error array', () => {
    const err = toCloudflareError({ errors: [{ message: 'Too many requests' }] }, 429);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('Too many requests');
    expect(err.message).toContain('HTTP 429');
  });
});


