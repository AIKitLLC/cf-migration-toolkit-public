import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { parseRedirectsFile } from '../redirects/parse-redirects-file.js';
import { applyRedirectRules, type AppliedRedirect } from './apply-redirect-rules.js';
import { renderFixturePage } from './render-fixture-page.js';

export interface RedirectOrigin {
  origin: string;
  close(): Promise<void>;
}

export interface RedirectOriginOptions {
  defaultStatus: number;
  readRules: () => string;
  port?: number;
  host?: string;
}

function resolveRedirect(
  rulesText: string,
  requestUrl: URL,
  defaultStatus: number,
): AppliedRedirect | null | 'invalid' {
  try {
    const rules = parseRedirectsFile(rulesText);
    return applyRedirectRules(requestUrl.pathname, requestUrl.searchParams, rules, defaultStatus);
  } catch {
    return 'invalid';
  }
}

export async function startRedirectOrigin(options: RedirectOriginOptions): Promise<RedirectOrigin> {
  const host = options.host ?? '127.0.0.1';
  const server = http.createServer((request, response) => {
    const hostHeader = request.headers.host ?? host;
    const requestUrl = new URL(request.url ?? '/', `http://${hostHeader}`);
    const applied = resolveRedirect(options.readRules(), requestUrl, options.defaultStatus);
    if (applied === 'invalid') {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('invalid redirects');
      return;
    }
    if (applied) {
      const location = new URL(applied.target, requestUrl).toString();
      response.writeHead(applied.status, {
        location,
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'public, max-age=0, must-revalidate',
      });
      response.end('redirect');
      return;
    }
    const body = renderFixturePage(requestUrl.toString(), requestUrl.pathname);
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
      'x-robots-tag': 'all',
    });
    response.end(body);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 0, host, () => resolve());
  });
  const address = server.address() as AddressInfo | null;
  if (!address) throw new Error('Redirect origin did not bind a port');
  return {
    origin: `http://${host}:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
