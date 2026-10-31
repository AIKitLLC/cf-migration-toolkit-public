import { spawn } from 'node:child_process';
import { copyFile, mkdir } from 'node:fs/promises';
import { relative, join } from 'node:path';
import { runCli } from '../../src/cli/run-cli.js';
import { isDirectRun } from './is-direct-run.js';
import { D1_CONVERSION, D1_DIST, D1_TOML, REPO_ROOT } from './paths.js';
import { writeFormUnsupportedReport } from './report-form.js';

let prepared: Promise<void> | undefined;

export function prepareD1Assets(): Promise<void> {
  prepared ??= prepareOnce().catch((error: unknown) => {
    prepared = undefined;
    throw error;
  });
  return prepared;
}

async function prepareOnce(): Promise<void> {
  await runAstroBuild();
  const code = await runCli([
    'convert',
    '--input',
    convertInput(),
    '--out',
    D1_DIST,
    '--source',
    'fixture',
    '--json',
    join(D1_DIST, 'conversion-report.json'),
    '--md',
    join(D1_DIST, 'conversion-report.md'),
  ]);
  if (code !== 0) throw new Error(`cfmt convert exited ${code}`);
  await writeFormUnsupportedReport(D1_DIST, join(D1_DIST, 'form-unsupported.json'));
}

export async function writeConversionBundle(outputDir: string): Promise<void> {
  await prepareD1Assets();
  await mkdir(outputDir, { recursive: true });
  await copyFile(join(D1_DIST, '_redirects'), join(outputDir, '_redirects'));
  await copyFile(join(D1_DIST, '_headers'), join(outputDir, '_headers'));
  await copyFile(join(D1_DIST, 'conversion-report.json'), join(outputDir, 'report.json'));
  await copyFile(join(D1_DIST, 'conversion-report.md'), join(outputDir, 'report.md'));
  await copyFile(join(D1_DIST, 'form-unsupported.json'), join(outputDir, 'form-unsupported.json'));
}

function convertInput(): string {
  const rel = relative(process.cwd(), D1_TOML);
  if (rel.length === 0 || rel.startsWith('..')) {
    throw new Error(`cfmt convert input must stay inside ${process.cwd()}`);
  }
  return rel.replaceAll('\\', '/');
}

if (isDirectRun(import.meta.url)) {
  writeConversionBundle(D1_CONVERSION).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}

function runAstroBuild(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['--filter', '@cfmt/d1-netlify-static-faq', 'build'], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
    });
    child.once('error', reject);
    child.once('exit', (status) => {
      if (status === 0) resolve();
      else reject(new Error(`astro build exited ${status ?? 'unknown'}`));
    });
  });
}
