import { describe, expect, it } from 'vitest';
import { createComparators } from '../../src/comparators/create-comparators.js';
import { isRetryableNetworkError } from '../../src/fetcher/retry-policy.js';
import { backoffMs } from '../../src/fetcher/backoff.js';
import { ParityVerifier } from '../../src/verify/parity-verifier.js';
import { responseView } from '../support/make-snapshot.js';
import { MapReader } from '../support/map-reader.js';
import { DEFAULT_HEADER_ALLOWLIST } from '../../src/headers/default-header-allowlist.js';

describe('retry policy', () => {
  it('retries network and timeout failures only', () => {
    expect(isRetryableNetworkError(Object.assign(new Error('connect'), { code: 'ECONNRESET' }))).toBe(true);
    expect(isRetryableNetworkError(Object.assign(new Error('slow'), { name: 'TimeoutError' }))).toBe(true);
    expect(isRetryableNetworkError(new TypeError('fetch failed'))).toBe(true);
    expect(isRetryableNetworkError(new Error('sitemap parse'))).toBe(false);
    expect(backoffMs(0)).toBe(25);
    expect(backoffMs(2)).toBe(100);
  });
});

describe('ParityVerifier fetch failures', () => {
  it('records fetch-failed and skips other checks when one origin throws', async () => {
    const reader = new MapReader({
      'https://old.example/page': Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }),
      'https://new.example/page': responseView({
        url: 'https://new.example/page',
        status: 200,
        body: '<html></html>',
      }),
    });
    const report = await new ParityVerifier(reader, createComparators()).verify({
      oldOrigin: 'https://old.example',
      newOrigin: 'https://new.example',
      source: 'fixture',
      paths: ['/page'],
      headers: [...DEFAULT_HEADER_ALLOWLIST],
      concurrency: 2,
      timeoutMs: 1000,
      retries: 0,
      userAgent: 'test',
    });
    expect(report.summary.source).toBe('fixture');
    expect(report.summary.evidence).toBeUndefined();
    expect(report.findings).toEqual([
      {
        path: '/page',
        check: 'fetch-failed',
        severity: 'error',
        old: 'connection refused',
        new: '(ok)',
      },
    ]);
  });
});
