import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const directory = join(process.cwd(), 'examples', 'convert-redirect-downgrade');

describe('committed convert evidence', () => {
  it('is a fixture report whose redirect states 301', async () => {
    const report = JSON.parse(await readFile(join(directory, 'report.json'), 'utf8')) as {
      summary: { source: string; ok: boolean };
      error: string | null;
      redirects: Array<{ output: string; statusOrigin: string }>;
    };
    const markdown = await readFile(join(directory, 'report.md'), 'utf8');
    const redirects = await readFile(join(directory, '_redirects'), 'utf8');
    expect(report.summary.source).toBe('fixture');
    expect(report.summary.ok).toBe(true);
    expect(report.error).toBeNull();
    expect(report.redirects[0]).toMatchObject({
      output: '/old-blog/* /blog/:splat 301',
      statusOrigin: 'netlify-default',
    });
    expect(markdown.startsWith('source: fixture\n')).toBe(true);
    expect(redirects).toContain('/old-blog/* /blog/:splat 301');
  });
});