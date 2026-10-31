export const DEFAULT_HEADER_ALLOWLIST = [
  'content-type',
  'cache-control',
  'x-robots-tag',
  'content-security-policy',
  'strict-transport-security',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'link',
] as const;

const DENIED_HEADERS = new Set([
  'set-cookie',
  'authorization',
  'cookie',
  'proxy-authorization',
  'x-api-key',
]);

export function parseHeaderAllowlist(value: string): string[] {
  const names = value
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter((name) => name.length > 0);
  if (names.length === 0) {
    throw new Error('--headers requires at least one header name');
  }
  for (const name of names) {
    if (!/^[a-z0-9-]+$/.test(name)) {
      throw new Error(`Invalid header name: ${name}`);
    }
    if (DENIED_HEADERS.has(name)) {
      throw new Error(`--headers cannot include ${name}`);
    }
  }
  return names;
}
