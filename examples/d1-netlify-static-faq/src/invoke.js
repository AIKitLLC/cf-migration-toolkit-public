/* global URL, Response */
// Same values as the converted `/*` rule in site/dist/_headers.
const HEADERS = {
  'content-type': 'text/plain; charset=utf-8',
  'cache-control': 'public, max-age=0, must-revalidate',
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'content-security-policy':
    "default-src 'self'; style-src 'self'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  'x-robots-tag': 'noindex',
};

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path !== '/__cfmt-invoke') return env.ASSETS.fetch(request);
    return new Response('cfmt-invoke\n', { status: 200, headers: HEADERS });
  },
};
