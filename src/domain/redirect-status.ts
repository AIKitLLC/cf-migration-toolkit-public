const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const PERMANENT_REDIRECTS = new Set([301, 308]);

export function isRedirectStatus(status: number): boolean {
  return REDIRECT_STATUSES.has(status);
}

export function isPermanentRedirect(status: number): boolean {
  return PERMANENT_REDIRECTS.has(status);
}
