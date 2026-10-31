import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/run-cli.js';
import { startRedirectOrigin } from '../../src/demo/redirect-origin-server.js';
import type { Finding } from '../../src/domain/finding.js';

const NETLIFY_RULE = '/old-blog/* /blog/:splat\n';

describe('convert then verify the redirect downgrade', () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    while (cleanups.length > 0) {
      const close = cleanups.pop();
      if (close) await close();
    }
  });

  it('passes verify after convert and fails when the Netlify file is copied unchanged', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cfmt-convert-'));
    const inputPath = join(directory, 'input', '_redirects');
    const outDir = join(directory, 'out');
    const jsonPath = join(directory, 'verify.json');
    const mdPath = join(directory, 'verify.md');
    await mkdir(join(directory, 'input'), { recursive: true });
    await writeFile(inputPath, NETLIFY_RULE, 'utf8');
    cleanups.push(() => rm(directory, { recursive: true, force: true }));

    const converted = await runCli([
      'convert',
      '--input',
      inputPath,
      '--out',
      outDir,
      '--source',
      'fixture',
      '--json',
      join(directory, 'convert.json'),
      '--md',
      join(directory, 'convert.md'),
    ]);
    const cloudflareRules = await readFile(join(outDir, '_redirects'), 'utf8');
    const convertReport = JSON.parse(await readFile(join(directory, 'convert.json'), 'utf8')) as {
      summary: { source: string };
    };
    const convertMarkdown = await readFile(join(directory, 'convert.md'), 'utf8');
    expect(converted).toBe(0);
    expect(cloudflareRules).toContain('/old-blog/* /blog/:splat 301');
    expect(convertReport.summary.source).toBe('fixture');
    expect(convertMarkdown.startsWith('source: fixture\n')).toBe(true);

    const oldOrigin = await startRedirectOrigin({ defaultStatus: 301, readRules: () => NETLIFY_RULE });
    const newOrigin = await startRedirectOrigin({ defaultStatus: 302, readRules: () => cloudflareRules });
    cleanups.push(async () => {
      await oldOrigin.close();
      await newOrigin.close();
    });

    const passed = await verify(oldOrigin.origin, newOrigin.origin, inputPath, jsonPath, mdPath);
    const clean = JSON.parse(await readFile(jsonPath, 'utf8')) as { findings: Finding[] };
    expect(passed).toBe(0);
    expect(clean.findings).toEqual([]);

    const copied = await startRedirectOrigin({ defaultStatus: 302, readRules: () => NETLIFY_RULE });
    cleanups.push(() => copied.close());
    const failed = await verify(oldOrigin.origin, copied.origin, inputPath, jsonPath, mdPath);
    const report = JSON.parse(await readFile(jsonPath, 'utf8')) as { findings: Finding[] };
    expect(failed).toBe(1);
    expect(report.findings).toContainEqual({
      path: '/old-blog/sample',
      check: 'redirect-status-changed',
      severity: 'error',
      old: '301',
      new: '302',
    });
  });
});

function verify(oldOrigin: string, newOrigin: string, redirectsPath: string, jsonPath: string, mdPath: string): Promise<number> {
  return runCli([
    'verify',
    '--old',
    oldOrigin,
    '--new',
    newOrigin,
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
}
