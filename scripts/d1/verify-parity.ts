import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { runCli } from '../../src/cli/run-cli.js';
import { writeAtomic } from '../../src/reporters/atomic-write.js';
import { startNetlifyStaticOrigin } from '../../src/demo/netlify-static-origin/start-netlify-static-origin.js';
import { assertAbsoluteNoindex } from './assert-noindex.js';
import { isDirectRun } from './is-direct-run.js';
import { D1_DIST, D1_OLD_URLS, D1_PARITY, D1_ROOT, D1_TOML, NETLIFY_PORT, WRANGLER_PORT } from './paths.js';
import { prepareD1Assets } from './prepare-assets.js';
import { startWranglerDev } from './start-wrangler-dev.js';

const HASH_PATHS = [
  '/',
  '/faq',
  '/form-stub',
  '/ein',
  '/apply-for-ein',
  '/estimated-tax-dates',
  '/library/sample',
  '/llc-ein',
  '/favicon.svg',
  '/robots.txt',
  '/sitemap.xml',
] as const;

export async function verifyD1Parity(outputDir: string): Promise<number> {
  await prepareD1Assets();
  await mkdir(outputDir, { recursive: true });
  const oldOrigin = await startNetlifyStaticOrigin({
    root: D1_DIST,
    netlifyTomlPath: D1_TOML,
    port: NETLIFY_PORT,
  });
  const worker = await startWranglerDev({
    cwd: D1_ROOT,
    configPath: 'wrangler.jsonc',
    port: WRANGLER_PORT,
    inspectorPort: 9230,
  });
  const newOrigin = `http://127.0.0.1:${WRANGLER_PORT}`;
  try {
    await assertAbsoluteNoindex(oldOrigin.origin, D1_OLD_URLS);
    await assertAbsoluteNoindex(newOrigin, D1_OLD_URLS);
    await assertInvokeSecurityHeaders(newOrigin);
    await writeContentHashes(oldOrigin.origin, newOrigin, outputDir);
    return await runCli([
      'verify',
      '--old',
      oldOrigin.origin,
      '--new',
      newOrigin,
      '--source',
      'fixture',
      '--sitemap',
      `${oldOrigin.origin}/sitemap.xml`,
      '--urls',
      D1_OLD_URLS,
      '--redirects',
      D1_TOML,
      '--fail-on-warn',
      '--json',
      join(outputDir, 'report.json'),
      '--md',
      join(outputDir, 'report.md'),
    ]);
  } finally {
    await worker.stop();
    await oldOrigin.close();
  }
}

async function writeContentHashes(oldOrigin: string, newOrigin: string, outputDir: string): Promise<void> {
  const rows = [];
  const mismatches: string[] = [];
  for (const path of HASH_PATHS) {
    const oldResponse = await fetch(`${oldOrigin}${path}`, { redirect: 'manual' });
    const newResponse = await fetch(`${newOrigin}${path}`, { redirect: 'manual' });
    const oldBody = Buffer.from(await oldResponse.arrayBuffer());
    const newBody = Buffer.from(await newResponse.arrayBuffer());
    const oldSha256 = sha256(oldBody);
    const newSha256 = sha256(newBody);
    const sameBody = oldSha256 === newSha256;
    rows.push({
      path,
      oldStatus: oldResponse.status,
      newStatus: newResponse.status,
      sameBody,
      oldSha256,
      newSha256,
    });
    if (oldResponse.status === 200 && newResponse.status === 200 && !sameBody) mismatches.push(path);
  }
  await writeAtomic(join(outputDir, 'content-hash.json'), `${JSON.stringify({ source: 'fixture', rows }, null, 2)}\n`);
  if (mismatches.length > 0) {
    throw new Error(`200 response bodies differ: ${mismatches.join(', ')}`);
  }
}

const INVOKE_HEADERS: Readonly<Record<string, string>> = {
  'cache-control': 'public, max-age=0, must-revalidate',
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'content-security-policy':
    "default-src 'self'; style-src 'self'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  'x-robots-tag': 'noindex',
};

async function assertInvokeSecurityHeaders(origin: string): Promise<void> {
  const response = await fetch(`${origin}/__cfmt-invoke`);
  const body = await response.text();
  if (response.status !== 200 || body !== 'cfmt-invoke\n') {
    throw new Error(`invoke status ${response.status}`);
  }
  const missing = Object.entries(INVOKE_HEADERS).flatMap(([name, want]) => {
    const got = response.headers.get(name);
    return got === want ? [] : [`${name}=${got ?? 'absent'}`];
  });
  if (missing.length > 0) throw new Error(`invoke security headers: ${missing.join(', ')}`);
}

function sha256(body: Buffer): string {
  return createHash('sha256').update(body).digest('hex');
}

if (isDirectRun(import.meta.url)) {
  verifyD1Parity(D1_PARITY)
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    });
}
