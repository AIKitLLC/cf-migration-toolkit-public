import http from 'node:http';
import { describe, expect, it } from 'vitest';
import { PoliteFetcher } from '../../src/fetcher/polite-fetcher.js';
import { Semaphore } from '../../src/fetcher/semaphore.js';
import { snapshotPage } from '../../src/fetcher/snapshot-page.js';
import { listen } from '../support/listen.js';

function fetcher(retries: number, timeoutMs = 1000): PoliteFetcher {
  return new PoliteFetcher({
    timeoutMs,
    retries,
    userAgent: 'cfmt-test',
    semaphore: new Semaphore(2),
  });
}

describe('PoliteFetcher', () => {
  it('keeps the first manual redirect and the final status', async () => {
    const server = await listen((request, response) => {
      expect(request.headers['user-agent']).toBe('cfmt-test');
      if (request.url === '/old') {
        response.writeHead(301, { location: '/new' });
        response.end('go');
        return;
      }
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end('<!doctype html><title>new</title>');
    });
    try {
      const snapshot = await snapshotPage(fetcher(0), new URL(server.origin), '/old');
      expect(snapshot.first.status).toBe(301);
      expect(snapshot.first.location).toBe('/new');
      expect(snapshot.hops).toBe(1);
      expect(snapshot.final.status).toBe(200);
      expect(snapshot.final.body).toContain('new');
    } finally {
      await server.close();
    }
  });

  it('retries a dropped connection and does not retry HTTP 500', async () => {
    let drops = 0;
    const flaky = await listen((request, response) => {
      drops += 1;
      if (drops === 1) {
        request.socket.destroy();
        return;
      }
      response.writeHead(200, { 'content-type': 'text/plain' });
      response.end('ok');
    });
    try {
      const view = await fetcher(1).read(`${flaky.origin}/`);
      expect(view.status).toBe(200);
      expect(drops).toBe(2);
    } finally {
      await flaky.close();
    }

    let statuses = 0;
    const failing = await listen((_request, response) => {
      statuses += 1;
      response.writeHead(500, { 'content-type': 'text/plain' });
      response.end('nope');
    });
    try {
      const view = await fetcher(2).read(`${failing.origin}/`);
      expect(view.status).toBe(500);
      expect(statuses).toBe(1);
    } finally {
      await failing.close();
    }
  });

  it('times out a silent server', async () => {
    const silent = http.createServer(() => undefined);
    await new Promise<void>((resolve) => silent.listen(0, '127.0.0.1', () => resolve()));
    const address = silent.address();
    if (!address || typeof address === 'string') throw new Error('no port');
    try {
      await expect(fetcher(0, 50).read(`http://127.0.0.1:${address.port}/`)).rejects.toThrow();
    } finally {
      silent.closeAllConnections?.();
      await new Promise<void>((resolve) => silent.close(() => resolve()));
    }
  });
});
