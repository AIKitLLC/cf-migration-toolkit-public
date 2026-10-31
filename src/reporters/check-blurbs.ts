import type { CheckId } from '../domain/check-id.js';

export const CHECK_BLURBS: Partial<Record<CheckId, string>> = {
  'redirect-status-changed':
    'A permanent redirect (301 or 308) came back temporary (302 or 307). Netlify treats a rule with no status code as 301. Cloudflare treats a `_redirects` rule with no status code as 302, so copying the file across downgrades the redirect.',
  'header-added':
    'The new origin sends a hardening header the old origin did not. The new response is stricter. This is not a regression.',
};
