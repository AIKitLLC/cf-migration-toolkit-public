import { readFile } from 'node:fs/promises';

export const MISSING_NOINDEX_PATH = '/__cfmt-missing';

export async function pathsFromUrlFile(filePath: string): Promise<string[]> {
  const text = await readFile(filePath, 'utf8');
  const paths: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const withoutComment = raw.replace(/^\s*#.*$/, '').replace(/\s+#.*$/, '');
    const path = withoutComment.trim();
    if (path.length === 0) continue;
    if (!path.startsWith('/')) throw new Error(`URL path must start with /: ${path}`);
    paths.push(path);
  }
  if (paths.length === 0) throw new Error(`no URL paths in ${filePath}`);
  return paths;
}

export async function assertAbsoluteNoindex(origin: string, urlFile: string): Promise<void> {
  const paths = await pathsFromUrlFile(urlFile);
  const failures: string[] = [];
  for (const path of paths) {
    failures.push(...(await noindexFailures(origin, path)));
  }
  const missing = await readResponse(origin, MISSING_NOINDEX_PATH);
  if (missing.status !== 404) {
    failures.push(`${origin}${MISSING_NOINDEX_PATH} status ${missing.status}, expected 404`);
  }
  if (!headerHasNoindex(missing.robots)) {
    failures.push(`${origin}${MISSING_NOINDEX_PATH} x-robots-tag is ${missing.robots || 'absent'}`);
  }
  if (failures.length > 0) {
    throw new Error(failures.join('\n'));
  }
}

async function noindexFailures(origin: string, path: string): Promise<string[]> {
  const response = await readResponse(origin, path);
  if (headerHasNoindex(response.robots)) return [];
  return [`${origin}${path} status ${response.status} x-robots-tag is ${response.robots || 'absent'}`];
}

async function readResponse(origin: string, path: string): Promise<{ status: number; robots: string }> {
  const response = await fetch(`${origin.replace(/\/$/, '')}${path}`, {
    redirect: 'manual',
    headers: { 'accept-encoding': 'identity' },
  });
  await response.arrayBuffer();
  return { status: response.status, robots: response.headers.get('x-robots-tag') ?? '' };
}

export function headerHasNoindex(value: string): boolean {
  return value
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((token) => token.length > 0)
    .includes('noindex');
}
