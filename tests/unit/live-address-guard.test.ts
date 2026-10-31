import { isIP } from 'node:net';
import { buildConnector } from 'undici';
import { afterEach, describe, expect, it } from 'vitest';
import { createComparators } from '../../src/comparators/create-comparators.js';
import { isBlockedAddressError } from '../../src/fetcher/blocked-address-error.js';
import { PoliteFetcher } from '../../src/fetcher/polite-fetcher.js';
import { createPublicConnector, type AddressResolver } from '../../src/fetcher/public-connect.js';
import { Semaphore } from '../../src/fetcher/semaphore.js';
import { DEFAULT_HEADER_ALLOWLIST } from '../../src/headers/default-header-allowlist.js';
import { CrawlUrlSource } from '../../src/url-sources/crawl-url-source.js';
import { SitemapUrlSource } from '../../src/url-sources/sitemap-url-source.js';
import { ParityVerifier } from '../../src/verify/parity-verifier.js';
import { listen, type LocalServer } from '../support/listen.js';

const servers: LocalServer[] = [];
const fetchers: PoliteFetcher[] = [];

afterEach(async () => {
  while (fetchers.length > 0) {
    await fetchers.pop()?.close();
  }
  while (servers.length > 0) {
    await servers.pop()?.close();
  }
});

function fetcher(partial: Partial<ConstructorParameters<typeof PoliteFetcher>[0]> = {}): PoliteFetcher {
  const created = new PoliteFetcher({
    timeoutMs: 500,
    retries: 0,
    userAgent: 'cfmt-test',
    semaphore: new Semaphore(2),
    guardPublicAddresses: true,
    ...partial,
  });
  fetchers.push(created);
  return created;
}

describe('connect-time public address guard', () => {
  it('rejects a resolver that returns a public address and then 127.0.0.1', async () => {
    const answers = ['1.1.1.1', '127.0.0.1'];
    const pinned: string[] = [];
    const connect = createPublicConnector(
      async () => [{ address: answers.shift() ?? '127.0.0.1', family: 4 }],
      (options, callback) => {
        pinned.push(options.hostname);
        callback(new Error('stop-before-dial'), null);
      },
    );
    await new Promise<void>((resolve, reject) => {
      connect({ hostname: 'flip.example', protocol: 'http:', port: '80' }, (error, _socket) => {
        if (error instanceof Error && error.message === 'stop-before-dial') resolve();
        else reject(error instanceof Error ? error : new Error('missing error'));
      });
    });
    await new Promise<void>((resolve, reject) => {
      connect({ hostname: 'flip.example', protocol: 'http:', port: '80' }, (error, _socket) => {
        if (isBlockedAddressError(error)) resolve();
        else reject(error instanceof Error ? error : new Error('missing error'));
      });
    });
    expect(pinned).toEqual(['1.1.1.1']);
  });

  it('does not open a socket to 0.0.0.0, loopback, unspecified, or link-local addresses', async () => {
    const hits: string[] = [];
    const server = await listen((request, response) => {
      hits.push(request.url ?? '');
      response.writeHead(200, { 'content-type': 'text/plain' });
      response.end('hit');
    });
    servers.push(server);
    const port = new URL(server.origin).port;
    const reader = fetcher();
    for (const url of [
      `http://0.0.0.0:${port}/zero`,
      `http://127.0.0.1:${port}/loop`,
      `http://[::]:${port}/unspecified`,
      `http://[fe80::1]:${port}/link-local`,
    ]) {
      await expect(reader.read(url)).rejects.toSatisfy((error: unknown) => isBlockedAddressError(error));
    }
    expect(hits).toEqual([]);
  });

  it('blocks a public host that redirects to 127.0.0.1 and does not emit a report', async () => {
    const hits: string[] = [];
    const pinned: string[] = [];
    const resolved: string[] = [];
    let port = '';
    const server = await listen((request, response) => {
      hits.push(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
      response.writeHead(302, { location: `http://127.0.0.1:${port}/secret` });
      response.end();
    });
    servers.push(server);
    port = new URL(server.origin).port;
    const dial = buildConnector({});
    const resolve: AddressResolver = async (hostname) => {
      resolved.push(hostname);
      if (hostname === 'public.test') return [{ address: '1.2.3.4', family: 4 }];
      const family = isIP(hostname);
      return [{ address: hostname, family: family === 0 ? 4 : family }];
    };
    const reader = fetcher({
      retries: 2,
      resolveAddresses: resolve,
      connect(options, callback) {
        pinned.push(options.hostname);
        if (options.hostname !== '1.2.3.4') {
          callback(new Error(`dialled ${options.hostname}`), null);
          return;
        }
        dial({ ...options, hostname: '127.0.0.1' }, callback);
      },
    });
    const origin = `http://public.test:${port}`;
    let report: unknown;
    await expect(async () => {
      report = await new ParityVerifier(reader, createComparators()).verify({
        oldOrigin: origin,
        newOrigin: origin,
        source: 'live',
        paths: ['/start'],
        headers: [...DEFAULT_HEADER_ALLOWLIST],
        concurrency: 2,
        timeoutMs: 500,
        retries: 2,
        userAgent: 'cfmt-test',
      });
    }).rejects.toSatisfy((error: unknown) => isBlockedAddressError(error));
    await reader.close();
    expect(report).toBeUndefined();
    expect(hits).not.toContain('/secret');
    expect(pinned.every((address) => address === '1.2.3.4')).toBe(true);
    const blockedLookups = resolved.filter((hostname) => hostname === '127.0.0.1');
    expect(blockedLookups.length).toBeGreaterThan(0);
    expect(blockedLookups.length).toBeLessThanOrEqual(2);
  });

  it('blocks sitemap and crawl fetches before a loopback connection', async () => {
    const hits: string[] = [];
    const server = await listen((_request, response) => {
      hits.push('hit');
      response.end('nope');
    });
    servers.push(server);
    const reader = fetcher();
    await expect(new SitemapUrlSource([`${server.origin}/sitemap.xml`], reader).collect()).rejects.toSatisfy(
      (error: unknown) => isBlockedAddressError(error),
    );
    await expect(new CrawlUrlSource(new URL(server.origin), 1, ['/'], reader).collect()).rejects.toSatisfy(
      (error: unknown) => isBlockedAddressError(error),
    );
    expect(hits).toEqual([]);
  });

  it('turns the guard on for a library live run that did not opt in at construction', async () => {
    const hits: string[] = [];
    const server = await listen((_request, response) => {
      hits.push('hit');
      response.end('nope');
    });
    servers.push(server);
    const reader = fetcher({ guardPublicAddresses: false });
    await expect(
      new ParityVerifier(reader, createComparators()).verify({
        oldOrigin: server.origin,
        newOrigin: server.origin,
        source: 'live',
        paths: ['/'],
        headers: [...DEFAULT_HEADER_ALLOWLIST],
        concurrency: 1,
        timeoutMs: 500,
        retries: 1,
        userAgent: 'cfmt-test',
      }),
    ).rejects.toSatisfy((error: unknown) => isBlockedAddressError(error));
    expect(hits).toEqual([]);
  });

  it('refuses live mode when the page reader cannot guard connections', async () => {
    const hits: string[] = [];
    const server = await listen((_request, response) => {
      hits.push('hit');
      response.end('secret');
    });
    servers.push(server);
    const reader = {
      async read(url: string) {
        const response = await fetch(url);
        return {
          url,
          status: response.status,
          headers: new Map<string, string>(),
          location: response.headers.get('location'),
          body: await response.text(),
        };
      },
    };
    let report: unknown;
    await expect(async () => {
      report = await new ParityVerifier(reader, createComparators()).verify({
        oldOrigin: server.origin,
        newOrigin: server.origin,
        source: 'live',
        paths: ['/'],
        headers: [...DEFAULT_HEADER_ALLOWLIST],
        concurrency: 1,
        timeoutMs: 500,
        retries: 0,
        userAgent: 'cfmt-test',
      });
    }).rejects.toThrow('live mode requires a page reader that guards connections');
    expect(report).toBeUndefined();
    expect(hits).toEqual([]);
  });

  it('wraps a custom connect function so a loopback fetch cannot produce E2', async () => {
    const hits: string[] = [];
    const server = await listen((_request, response) => {
      hits.push('hit');
      response.end('secret');
    });
    servers.push(server);
    const reader = fetcher({
      guardPublicAddresses: false,
      connect: buildConnector({}),
    });
    let report: unknown;
    await expect(async () => {
      report = await new ParityVerifier(reader, createComparators()).verify({
        oldOrigin: server.origin,
        newOrigin: server.origin,
        source: 'live',
        paths: ['/'],
        headers: [...DEFAULT_HEADER_ALLOWLIST],
        concurrency: 1,
        timeoutMs: 500,
        retries: 0,
        userAgent: 'cfmt-test',
      });
    }).rejects.toSatisfy((error: unknown) => isBlockedAddressError(error));
    expect(report).toBeUndefined();
    expect(hits).toEqual([]);
  });
});
