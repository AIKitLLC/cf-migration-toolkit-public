import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../../scripts/d1/paths.js';

const HEADERS: Readonly<Record<string, string>> = {
  'content-type': 'text/plain; charset=utf-8',
  'cache-control': 'public, max-age=0, must-revalidate',
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'content-security-policy':
    "default-src 'self'; style-src 'self'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  'x-robots-tag': 'noindex',
};

type InvokeWorker = {
  default: {
    fetch: (
      request: Request,
      env: { ASSETS: { fetch: (request: Request) => Promise<Response> } },
    ) => Promise<Response>;
  };
};

async function loadWorker(): Promise<InvokeWorker['default']> {
  const href = pathToFileURL(join(REPO_ROOT, 'examples/d1-netlify-static-faq/src/invoke.js')).href;
  const loaded = (await import(href)) as InvokeWorker;
  return loaded.default;
}

describe('d1 invoke worker', () => {
  it('copies the converted security headers onto /__cfmt-invoke', async () => {
    const worker = await loadWorker();
    const response = await worker.fetch(new Request('https://example.test/__cfmt-invoke?ready=nonce'), {
      ASSETS: {
        fetch: () => Promise.reject(new Error('assets should not handle the invoke path')),
      },
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('cfmt-invoke\n');
    for (const [name, value] of Object.entries(HEADERS)) {
      expect(response.headers.get(name)).toBe(value);
    }
  });

  it('leaves other paths on the asset binding', async () => {
    const worker = await loadWorker();
    let seen = '';
    const response = await worker.fetch(new Request('https://example.test/faq'), {
      ASSETS: {
        fetch: (request) => {
          seen = new URL(request.url).pathname;
          return Promise.resolve(new Response('page', { status: 200 }));
        },
      },
    });
    expect(seen).toBe('/faq');
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('page');
  });
});
