export const UNSUPPORTED_REASONS = [
  'missing-target',
  'signed-proxy',
  'proxy-request-headers',
  'domain-level',
  'role',
  'cookie',
  'country-or-language',
  'query-parameters',
  'has-or-missing',
  'pattern',
  'external-proxy',
  'unsupported-status',
  'trailing-slash',
  'clean-urls',
  'header-pattern',
  'ignored-routes',
] as const;

export type UnsupportedReason = (typeof UNSUPPORTED_REASONS)[number];

export type SuggestedAlternative = 'bulk-redirects' | 'redirect-rules' | 'worker';

export const UNSUPPORTED_MESSAGE: Record<UnsupportedReason, string> = {
  'missing-target': 'This rule has no target, so it cannot be written as a Cloudflare _redirects line.',
  'signed-proxy': 'Cloudflare _redirects cannot express a signed proxy.',
  'proxy-request-headers': 'Cloudflare _redirects cannot attach proxy request headers.',
  'domain-level': 'Cloudflare _redirects cannot express a domain-level redirect. The source has to be a path on the same site.',
  role: 'Cloudflare _redirects cannot match a Netlify Identity role.',
  cookie: 'Cloudflare _redirects cannot match a cookie.',
  'country-or-language': 'Cloudflare _redirects cannot match country or language.',
  'query-parameters': 'Cloudflare _redirects cannot match query parameters.',
  'has-or-missing': 'Cloudflare _redirects cannot express has or missing conditions.',
  pattern: 'Cloudflare _redirects allows one splat at the end of the source and :placeholder names. This pattern does not fit.',
  'external-proxy': 'Cloudflare _redirects can proxy with status 200 only to a relative URL on the same site.',
  'unsupported-status': 'Cloudflare _redirects only supports 301, 302, 303, 307, 308, and a relative 200 proxy. 404 rewrites and other statuses are not supported.',
  'trailing-slash': 'Vercel trailingSlash redirects with 308. A _redirects splat cannot add or remove a trailing slash at every depth without looping, and it cannot skip paths that have a file extension.',
  'clean-urls': 'Vercel cleanUrls redirects an .html URL to the extensionless path with 308 and rewrites that path onto the HTML file. A blanket _redirects proxy would also rewrite non-HTML assets. Workers html_handling redirects with 307, which does not keep the 308.',
  'header-pattern': 'Cloudflare _headers cannot express this path pattern.',
  'ignored-routes': 'vercel.json routes are a legacy regex table. This converter reads redirects, rewrites, headers, trailingSlash, and cleanUrls.',
};

export const UNSUPPORTED_ALTERNATIVE: Record<UnsupportedReason, SuggestedAlternative> = {
  'missing-target': 'worker',
  'signed-proxy': 'worker',
  'proxy-request-headers': 'worker',
  'domain-level': 'bulk-redirects',
  role: 'worker',
  cookie: 'redirect-rules',
  'country-or-language': 'redirect-rules',
  'query-parameters': 'redirect-rules',
  'has-or-missing': 'redirect-rules',
  pattern: 'worker',
  'external-proxy': 'worker',
  'unsupported-status': 'worker',
  'trailing-slash': 'worker',
  'clean-urls': 'worker',
  'header-pattern': 'worker',
  'ignored-routes': 'worker',
};

export function chooseAlternative(reasons: readonly UnsupportedReason[]): SuggestedAlternative {
  const alternatives = reasons.map((reason) => UNSUPPORTED_ALTERNATIVE[reason]);
  if (alternatives.includes('worker')) return 'worker';
  if (alternatives.includes('redirect-rules')) return 'redirect-rules';
  return 'bulk-redirects';
}

export function messageForReasons(reasons: readonly UnsupportedReason[]): string {
  return reasons.map((reason) => UNSUPPORTED_MESSAGE[reason]).join(' ');
}
