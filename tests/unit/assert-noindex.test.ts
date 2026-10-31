import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertAbsoluteNoindex, headerHasNoindex } from '../../scripts/d1/assert-noindex.js';
import { listen } from '../support/listen.js';

describe('absolute noindex', () => {
  it('accepts noindex on every listed URL and on a 404', async () => {
    expect(headerHasNoindex('noindex, nofollow')).toBe(true);
    expect(headerHasNoindex('all')).toBe(false);
    const dir = await mkdtemp(join(tmpdir(), 'cfmt-urls-'));
    const urlFile = join(dir, 'old-urls.txt');
    await writeFile(urlFile, '# comment\n/ein\n/apply-for-ein\n', 'utf8');
    const server = await listen((request, response) => {
      const path = request.url ?? '/';
      if (path === '/__cfmt-missing') {
        response.writeHead(404, { 'x-robots-tag': 'noindex' });
        response.end('missing');
        return;
      }
      response.writeHead(path === '/ein' ? 301 : 200, { 'x-robots-tag': 'noindex', location: '/faq' });
      response.end('ok');
    });
    try {
      await assertAbsoluteNoindex(server.origin, urlFile);
    } finally {
      await server.close();
    }
  });

  it('fails when a listed URL or the 404 lacks noindex', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cfmt-urls-'));
    const urlFile = join(dir, 'old-urls.txt');
    await writeFile(urlFile, '/ein\n', 'utf8');
    const server = await listen((_request, response) => {
      response.writeHead(200, { 'x-robots-tag': 'all' });
      response.end('ok');
    });
    try {
      await expect(assertAbsoluteNoindex(server.origin, urlFile)).rejects.toThrow(/x-robots-tag is all/);
    } finally {
      await server.close();
    }
  });
});
