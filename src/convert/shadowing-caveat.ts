import type { MigrationRedirect } from '../redirects/migration-document.js';

export const SHADOWING_CAVEAT =
  'This rule is not forced. Netlify skips an unforced rule when a file already exists, and Vercel applies rewrites after the filesystem. Cloudflare _redirects always applies the rule, even when an asset exists.';

export function shadowingCaveat(rule: MigrationRedirect): string | null {
  if (rule.platform === 'netlify' && rule.force) return null;
  if (rule.platform === 'vercel' && rule.kind === 'redirect') return null;
  return SHADOWING_CAVEAT;
}
