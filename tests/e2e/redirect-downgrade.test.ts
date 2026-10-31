import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/run-cli.js';
import { startRedirectOrigin } from '../../src/demo/redirect-origin-server.js';
import type { Finding } from '../../src/domain/finding.js';

const RULE_WITHOUT_STATUS = '/old-blog/* /blog/:splat\n';
const RULE_WITH_301 = '/old-blog/* /blog/:splat 301\n';

describe('redirect downgrade fixture', () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    while (cleanups.length > 0) {
      const close = cleanups.pop();
      if (close) await close();
    }
  });

  it('reports 301 to 302, then passes once the rule states 301', async () => {
    let rules = RULE_WITHOUT_STATUS;
    const oldOrigin = await startRedirectOrigin({ defaultStatus: 301, readRules: () => rules });
    const newOrigin = await startRedirectOrigin({ defaultStatus: 302, readRules: () => rules });
    const directory = await mkdtemp(join(tmpdir(), 'cfmt-downgrade-'));
    cleanups.push(async () => {
      await oldOrigin.close();
      await newOrigin.close();
      await rm(directory, { recursive: true, force: true });
    });
    const redirectsPath = join(directory, '_redirects');
    const jsonPath = join(directory, 'report.json');
    const mdPath = join(directory, 'report.md');
    await writeFile(redirectsPath, rules, 'utf8');

    const failed = await runCli([
      'verify',
      '--old',
      oldOrigin.origin,
      '--new',
      newOrigin.origin,
      '--source',
      'fixture',
      '--redirects',
      redirectsPath,
      '--json',
      jsonPath,
      '--md',
      mdPath,
      '--concurrency',
      '2',
      '--timeout',
      '2000',
      '--retries',
      '0',
    ]);
    const report = JSON.parse(await readFile(jsonPath, 'utf8')) as {
      summary: { source: string; counts: { error: number } };
      findings: Finding[];
    };
    const markdown = await readFile(mdPath, 'utf8');
    expect(failed).toBe(1);
    expect(report.summary.source).toBe('fixture');
    expect(report.findings).toContainEqual({
      path: '/old-blog/sample',
      check: 'redirect-status-changed',
      severity: 'error',
      old: '301',
      new: '302',
    });
    expect(markdown.startsWith('source: fixture\n')).toBe(true);
    expect(markdown.indexOf('### redirect-status-changed')).toBeLessThan(markdown.indexOf('## Warnings'));

    rules = RULE_WITH_301;
    await writeFile(redirectsPath, rules, 'utf8');
    const passed = await runCli([
      'verify',
      '--old',
      oldOrigin.origin,
      '--new',
      newOrigin.origin,
      '--source',
      'fixture',
      '--redirects',
      redirectsPath,
      '--json',
      jsonPath,
      '--md',
      mdPath,
      '--concurrency',
      '2',
      '--timeout',
      '2000',
      '--retries',
      '0',
    ]);
    const clean = JSON.parse(await readFile(jsonPath, 'utf8')) as {
      findings: Finding[];
      summary: { counts: { error: number; warning: number; info: number } };
    };
    expect(passed).toBe(0);
    expect(clean.findings).toEqual([]);
    expect(clean.summary.counts).toEqual({ error: 0, warning: 0, info: 0 });
  });
});
