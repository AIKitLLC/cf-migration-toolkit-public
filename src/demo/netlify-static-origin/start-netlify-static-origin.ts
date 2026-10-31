import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname } from 'node:path';
import { parseNetlifyConfig } from '../../redirects/parse-netlify-config.js';
import { contentTypeForExtension } from './content-type-for-extension.js';
import type { OriginPlan } from './plan-netlify-response.js';
import { NetlifyRequestPlanner } from './plan-netlify-response.js';
import { StaticAssetResolver } from './static-asset-resolver.js';

const MAX_DISCARDED_BODY_BYTES = 65_536;

export interface NetlifyStaticOrigin {
  origin: string;
  close(): Promise<void>;
}

export async function startNetlifyStaticOrigin(options: {
  root: string;
  netlifyTomlPath: string;
  port?: number;
  host?: string;
}): Promise<NetlifyStaticOrigin> {
  const host = options.host ?? '127.0.0.1';
  const toml = await readFile(options.netlifyTomlPath, 'utf8');
  const planner = new NetlifyRequestPlanner(parseNetlifyConfig(toml, options.netlifyTomlPath), new StaticAssetResolver(options.root));
  const server = http.createServer((request, response) => {
    void handle(planner, host, request, response);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 0, host, () => resolve());
  });
  const address = server.address() as AddressInfo | null;
  if (!address) throw new Error('Netlify-style origin did not bind a port');
  return {
    origin: `http://${host}:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

async function handle(
  planner: NetlifyRequestPlanner,
  host: string,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const method = request.method ?? 'GET';
  if (method === 'POST') await discardBody(request);
  const hostHeader = request.headers.host ?? host;
  const url = new URL(request.url ?? '/', `http://${hostHeader}`);
  const plan = planner.plan(method, url.pathname);
  const headers = outgoingHeaders(plan, hostHeader);
  if (!plan.filePath || method === 'HEAD') {
    response.writeHead(plan.status, headers);
    response.end();
    return;
  }
  response.writeHead(plan.status, headers);
  createReadStream(plan.filePath).pipe(response);
}

function outgoingHeaders(plan: OriginPlan, hostHeader: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (plan.filePath) headers['content-type'] = contentTypeForExtension(extname(plan.filePath));
  for (const [name, value] of plan.headers) headers[name] = value;
  if (plan.locationPath) headers.location = new URL(plan.locationPath, `http://${hostHeader}`).toString();
  return headers;
}

async function discardBody(request: IncomingMessage): Promise<void> {
  let bytes = 0;
  for await (const chunk of request) {
    const piece = chunk as Buffer;
    bytes += piece.length;
    if (bytes > MAX_DISCARDED_BODY_BYTES) {
      request.destroy();
      return;
    }
  }
}
