import { readFile } from 'node:fs/promises';
import { writeAtomic } from '../../src/reporters/atomic-write.js';
import { isDirectRun } from './is-direct-run.js';

export interface TailMatch {
  rayId: string;
  outcome: string;
  timestamp: string;
  path: string;
}

export function jsonObjects(raw: string): unknown[] {
  const found: unknown[] = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (inString) {
      if (escape) escape = false;
      else if (char === '\\') escape = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }
    if (char === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        try {
          found.push(JSON.parse(raw.slice(start, index + 1)));
        } catch {
          // Wrangler may print a non-JSON line. Skip it.
        }
        start = -1;
      }
    }
  }
  return found;
}

function normalizeRayId(rayId: string): string {
  return rayId.toLowerCase().replace(/-[a-z]+$/, '');
}

export function extractTailMatch(raw: string, rayId: string): TailMatch {
  const wanted = normalizeRayId(rayId);
  for (const value of jsonObjects(raw)) {
    const match = matchEvent(value, wanted);
    if (match) return match;
  }
  throw new Error(`tail file has no event for ray ${rayId}`);
}

export async function writeTailMatch(rawPath: string, rayId: string, outPath: string): Promise<TailMatch> {
  const match = extractTailMatch(await readFile(rawPath, 'utf8'), rayId);
  await writeAtomic(outPath, `${JSON.stringify(match, null, 2)}\n`);
  return match;
}

function matchEvent(value: unknown, wantedRay: string): TailMatch | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const ray = rayOf(record);
  if (!ray || normalizeRayId(ray) !== wantedRay) return null;
  const path = pathOf(record);
  if (path !== '/__cfmt-invoke') return null;
  if (typeof record.outcome !== 'string' || record.outcome.length === 0) return null;
  const timestamp = timestampOf(record);
  if (!timestamp) return null;
  return { rayId: ray, outcome: record.outcome, timestamp, path };
}

function rayOf(record: Record<string, unknown>): string | null {
  const headers = requestHeaders(record);
  if (headers['cf-ray']) return headers['cf-ray'];
  return typeof record.rayId === 'string' ? record.rayId : null;
}

function pathOf(record: Record<string, unknown>): string | null {
  const request = requestOf(record);
  const url = request?.url;
  if (typeof url !== 'string') return null;
  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
}

function timestampOf(record: Record<string, unknown>): string | null {
  const value = record.eventTimestamp;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return new Date(value).toISOString();
}

function requestOf(record: Record<string, unknown>): Record<string, unknown> | null {
  const event = record.event;
  if (!event || typeof event !== 'object') return null;
  const request = (event as Record<string, unknown>).request;
  if (!request || typeof request !== 'object') return null;
  return request as Record<string, unknown>;
}

function requestHeaders(record: Record<string, unknown>): Record<string, string> {
  const headers = requestOf(record)?.headers;
  if (!headers || typeof headers !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') out[key.toLowerCase()] = value;
  }
  return out;
}

function flag(argv: readonly string[], name: string): string {
  const index = argv.indexOf(name);
  const value = index >= 0 ? argv[index + 1] : undefined;
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}`);
  return value;
}

if (isDirectRun(import.meta.url)) {
  try {
    const argv = process.argv.slice(2);
    await writeTailMatch(flag(argv, '--tail'), flag(argv, '--ray'), flag(argv, '--out'));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
