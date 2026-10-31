import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { writeAtomic } from '../../src/reporters/atomic-write.js';
import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isDirectRun } from './is-direct-run.js';
import { D1_DIST, D1_ROLLBACK, ROLLBACK_SWITCH_PORT, ROLLBACK_V1_PORT, ROLLBACK_V2_PORT } from './paths.js';
import { prepareD1Assets } from './prepare-assets.js';
import { startWranglerDev, type WranglerDev } from './start-wrangler-dev.js';

export interface SimulatedLocalRollback {
  label: 'simulated-local';
  elapsedMs: number;
  method: string;
  fromVersion: 'v2';
  toVersion: 'v1';
  workersDev: {
    status: 'not-measured';
    after: 'maintainer approval';
    procedure: 'examples/d1-netlify-static-faq/GO-LIVE.md';
  };
}

export async function measureSimulatedLocalRollback(outputDir: string): Promise<SimulatedLocalRollback> {
  await prepareD1Assets();
  const root = join(tmpdir(), `d1-rollback-${process.pid}`);
  await rm(root, { recursive: true, force: true });
  const v1Dir = join(root, 'v1');
  const v2Dir = join(root, 'v2');
  await writeVersion(v1Dir, 'v1', 'd1-rollback-v1');
  await writeVersion(v2Dir, 'v2', 'd1-rollback-v2');
  const v1 = await startWranglerDev({
    cwd: v1Dir,
    configPath: 'wrangler.jsonc',
    port: ROLLBACK_V1_PORT,
    inspectorPort: 9231,
  });
  const v2 = await startWranglerDev({
    cwd: v2Dir,
    configPath: 'wrangler.jsonc',
    port: ROLLBACK_V2_PORT,
    inspectorPort: 9232,
  });
  const upstream = { origin: v2Origin(v2) };
  const server = http.createServer((request, response) => {
    void proxy(upstream, request, response);
  });
  await listen(server, ROLLBACK_SWITCH_PORT);
  try {
    await expectVersion(v1Origin(v1), 'v1');
    await expectVersion(v2Origin(v2), 'v2');
    await expectVersion(`http://127.0.0.1:${ROLLBACK_SWITCH_PORT}`, 'v2');
    const started = process.hrtime.bigint();
    upstream.origin = v1Origin(v1);
    const body = await readVersion(`http://127.0.0.1:${ROLLBACK_SWITCH_PORT}`);
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000;
    if (body !== 'v1') throw new Error(`simulated-local rollback returned ${body}`);
    const report: SimulatedLocalRollback = {
      label: 'simulated-local',
      elapsedMs: Math.round(elapsedMs * 1000) / 1000,
      method:
        'Two copies of the demo assets ran under wrangler dev --local. A local switch sent traffic to v2, then moved it to v1. elapsedMs is the time from that move until the switch returned the v1 marker. This is not a workers.dev timing.',
      fromVersion: 'v2',
      toVersion: 'v1',
      workersDev: {
        status: 'not-measured',
        after: 'maintainer approval',
        procedure: 'examples/d1-netlify-static-faq/GO-LIVE.md',
      },
    };
    await mkdir(outputDir, { recursive: true });
    await writeAtomic(join(outputDir, 'simulated-local.json'), `${JSON.stringify(report, null, 2)}\n`);
    await writeAtomic(join(outputDir, 'simulated-local.md'), renderMarkdown(report));
    return report;
  } finally {
    await closeServer(server);
    await v1.stop();
    await v2.stop();
    await rm(root, { recursive: true, force: true });
  }
}

async function writeVersion(directory: string, marker: string, name: string): Promise<void> {
  const dist = join(directory, 'dist');
  await mkdir(dist, { recursive: true });
  await cp(D1_DIST, dist, { recursive: true });
  await writeFile(join(dist, 'version.txt'), `${marker}\n`, 'utf8');
  const config = {
    name,
    compatibility_date: '2026-10-15',
    assets: {
      directory: './dist',
      html_handling: 'none',
      not_found_handling: 'none',
    },
  };
  await writeFile(join(directory, 'wrangler.jsonc'), `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function v1Origin(worker: WranglerDev): string {
  return `http://127.0.0.1:${worker.port}`;
}

function v2Origin(worker: WranglerDev): string {
  return `http://127.0.0.1:${worker.port}`;
}

async function proxy(
  upstream: { origin: string },
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const url = new URL(request.url ?? '/', upstream.origin);
  const incoming = await fetch(url, {
    method: request.method,
    redirect: 'manual',
    headers: { 'accept-encoding': 'identity' },
  });
  const headers: Record<string, string> = {};
  incoming.headers.forEach((value, key) => {
    if (key === 'transfer-encoding' || key === 'content-length' || key === 'content-encoding') return;
    headers[key] = value;
  });
  response.writeHead(incoming.status, headers);
  response.end(Buffer.from(await incoming.arrayBuffer()));
}

function listen(server: http.Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve());
  });
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function expectVersion(origin: string, marker: string): Promise<void> {
  const body = await readVersion(origin);
  if (body !== marker) throw new Error(`${origin} returned ${body}, expected ${marker}`);
}

async function readVersion(origin: string): Promise<string> {
  const response = await fetch(`${origin}/version.txt`, {
    redirect: 'manual',
    headers: { 'accept-encoding': 'identity' },
  });
  if (response.status !== 200) throw new Error(`${origin}/version.txt returned ${response.status}`);
  return (await response.text()).trim();
}

function renderMarkdown(report: SimulatedLocalRollback): string {
  return [
    'label: simulated-local',
    '',
    `elapsedMs: ${report.elapsedMs}`,
    '',
    report.method,
    '',
    `The workers.dev rollback timing is not measured here. ${report.workersDev.procedure} records it after ${report.workersDev.after}. That measured value replaces this simulated-local number.`,
    '',
  ].join('\n');
}

if (isDirectRun(import.meta.url)) {
  measureSimulatedLocalRollback(D1_ROLLBACK).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
