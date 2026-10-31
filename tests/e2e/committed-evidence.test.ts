import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Finding } from '../../src/domain/finding.js';

const directory = join(process.cwd(), 'examples', 'redirect-downgrade');

describe('committed redirect-downgrade evidence', () => {
  it('is a fixture report with the 301 to 302 error first', async () => {
    const report = JSON.parse(await readFile(join(directory, 'report.json'), 'utf8')) as {
      summary: { source: string };
      findings: Finding[];
    };
    const markdown = await readFile(join(directory, 'report.md'), 'utf8');
    expect(report.summary.source).toBe('fixture');
    expect(report.findings[0]).toEqual({
      path: '/old-blog/sample',
      check: 'redirect-status-changed',
      severity: 'error',
      old: '301',
      new: '302',
    });
    expect(markdown.startsWith('source: fixture\n')).toBe(true);
    expect(markdown.indexOf('### redirect-status-changed')).toBeLessThan(markdown.indexOf('## Warnings'));
  });
});
