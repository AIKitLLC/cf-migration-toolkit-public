import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCli } from '../src/cli/run-cli.js';
import { startRedirectOrigin } from '../src/demo/redirect-origin-server.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const directory = join(root, 'examples', 'redirect-downgrade');
const rules = '/old-blog/* /blog/:splat\n';
const redirectsPath = join(directory, '_redirects');
const jsonPath = join(directory, 'report.json');
const mdPath = join(directory, 'report.md');

await mkdir(directory, { recursive: true });
await writeFile(redirectsPath, rules, 'utf8');

const oldOrigin = await startRedirectOrigin({
  defaultStatus: 301,
  readRules: () => rules,
  port: 41731,
});
const newOrigin = await startRedirectOrigin({
  defaultStatus: 302,
  readRules: () => rules,
  port: 41732,
});

try {
  const code = await runCli([
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
    '5000',
    '--retries',
    '0',
  ]);
  if (code !== 1) {
    throw new Error(`Expected the downgrade evidence run to exit 1, got ${code}`);
  }
} finally {
  await oldOrigin.close();
  await newOrigin.close();
}
