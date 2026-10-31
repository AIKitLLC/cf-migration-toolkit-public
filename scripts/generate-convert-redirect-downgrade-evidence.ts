import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCli } from '../src/cli/run-cli.js';
import { startRedirectOrigin } from '../src/demo/redirect-origin-server.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const directory = join(root, 'examples', 'convert-redirect-downgrade');
const rules = '/old-blog/* /blog/:splat\n';
const relativeInput = 'examples/convert-redirect-downgrade/input/_redirects';
const inputPath = join(root, relativeInput);

await mkdir(dirname(inputPath), { recursive: true });
await writeFile(inputPath, rules, 'utf8');

const convertedCode = await runCli([
  'convert',
  '--input',
  relativeInput,
  '--out',
  directory,
  '--source',
  'fixture',
  '--json',
  join(directory, 'report.json'),
  '--md',
  join(directory, 'report.md'),
]);
if (convertedCode !== 0) {
  throw new Error(`Expected convert to exit 0, got ${convertedCode}`);
}

const cloudflareRules = await readFile(join(directory, '_redirects'), 'utf8');
if (!cloudflareRules.includes('/old-blog/* /blog/:splat 301')) {
  throw new Error('Converted _redirects did not contain an explicit 301');
}

const oldOrigin = await startRedirectOrigin({
  defaultStatus: 301,
  readRules: () => rules,
  port: 41741,
});
const newOrigin = await startRedirectOrigin({
  defaultStatus: 302,
  readRules: () => cloudflareRules,
  port: 41742,
});
const scratch = await mkdtemp(join(tmpdir(), 'cfmt-convert-evidence-'));

try {
  const passed = await verify(oldOrigin.origin, newOrigin.origin, join(scratch, 'pass'));
  if (passed !== 0) throw new Error(`Expected converted rules to verify clean, got ${passed}`);

  const copied = await startRedirectOrigin({
    defaultStatus: 302,
    readRules: () => rules,
    port: 41743,
  });
  try {
    const failed = await verify(oldOrigin.origin, copied.origin, join(scratch, 'fail'));
    if (failed !== 1) throw new Error(`Expected the unconverted copy to exit 1, got ${failed}`);
  } finally {
    await copied.close();
  }
} finally {
  await oldOrigin.close();
  await newOrigin.close();
  await rm(scratch, { recursive: true, force: true });
}

function verify(oldOrigin: string, newOrigin: string, prefix: string): Promise<number> {
  return runCli([
    'verify',
    '--old',
    oldOrigin,
    '--new',
    newOrigin,
    '--source',
    'fixture',
    '--redirects',
    relativeInput,
    '--json',
    `${prefix}.json`,
    '--md',
    `${prefix}.md`,
    '--concurrency',
    '2',
    '--timeout',
    '5000',
    '--retries',
    '0',
  ]);
}
