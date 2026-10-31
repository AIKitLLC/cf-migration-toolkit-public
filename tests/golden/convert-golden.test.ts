import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderHeadersFile } from '../../src/convert/render-headers-file.js';
import { renderRedirectsFile } from '../../src/convert/render-redirect-line.js';
import { convertProject } from '../../src/convert/rule-converter.js';
import { migrationFromNamedFile } from '../../src/redirects/migration-from-named-file.js';

const root = join(process.cwd(), 'tests', 'golden');

describe('convert golden files', () => {
  it('converts a Netlify _redirects file', async () => {
    await expectGolden(join(root, 'netlify-redirects'), '_redirects', true, false);
  });

  it('converts netlify.toml redirects and headers', async () => {
    await expectGolden(join(root, 'netlify-toml'), 'netlify.toml', true, true);
  });

  it('converts a Netlify _headers file', async () => {
    await expectGolden(join(root, 'netlify-headers'), '_headers', false, true);
  });

  it('converts vercel.json redirects, rewrites, headers, trailingSlash, and cleanUrls', async () => {
    await expectGolden(join(root, 'vercel'), 'vercel.json', true, true);
  });
});

async function expectGolden(directory: string, inputName: string, redirects: boolean, headers: boolean): Promise<void> {
  const text = await readFile(join(directory, inputName), 'utf8');
  const draft = convertProject(migrationFromNamedFile(text, inputName));
  if (redirects) {
    const expected = await readFile(join(directory, 'expected._redirects'), 'utf8');
    expect(renderRedirectsFile(draft.redirects.map((rule) => rule.output))).toBe(expected);
  } else {
    expect(draft.redirects).toEqual([]);
  }
  if (headers) {
    const expected = await readFile(join(directory, 'expected._headers'), 'utf8');
    expect(renderHeadersFile(draft.headers)).toBe(expected);
  } else {
    expect(draft.headers).toEqual([]);
  }
  const unsupportedPath = join(directory, 'expected-unsupported.json');
  try {
    const expected = JSON.parse(await readFile(unsupportedPath, 'utf8')) as unknown;
    expect(draft.unsupported.map(summary)).toEqual(expected);
  } catch (error) {
    if (!isMissing(error)) throw error;
    expect(draft.unsupported).toEqual([]);
  }
}

function summary(entry: { from: string; reasons: readonly string[]; alternative: string }): {
  from: string;
  reasons: readonly string[];
  alternative: string;
} {
  return { from: entry.from, reasons: entry.reasons, alternative: entry.alternative };
}

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
