export const HARDENING_HEADERS = [
  'content-security-policy',
  'referrer-policy',
  'x-frame-options',
  'x-content-type-options',
  'permissions-policy',
  'strict-transport-security',
] as const;

const HARDENING = new Set<string>(HARDENING_HEADERS);

export function isHardeningHeader(name: string): boolean {
  return HARDENING.has(name.toLowerCase());
}
