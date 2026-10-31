import type { MigrationRedirect } from '../redirects/migration-document.js';

export type StatusOrigin = 'explicit' | 'netlify-default' | 'vercel-permanent' | 'vercel-temporary';

export interface ResolvedStatus {
  status: number;
  origin: StatusOrigin;
}

export function resolveRedirectStatus(rule: MigrationRedirect): ResolvedStatus {
  if (rule.platform === 'vercel' && rule.kind === 'redirect') {
    if (rule.explicitStatus && rule.status !== null && !Number.isNaN(rule.status)) {
      return { status: rule.status, origin: 'explicit' };
    }
    if (rule.permanent === false) return { status: 307, origin: 'vercel-temporary' };
    return { status: 308, origin: 'vercel-permanent' };
  }
  if (rule.status !== null && !Number.isNaN(rule.status)) return { status: rule.status, origin: 'explicit' };
  if (rule.explicitStatus && rule.status !== null && Number.isNaN(rule.status)) {
    return { status: Number.NaN, origin: 'explicit' };
  }
  return { status: 301, origin: 'netlify-default' };
}
