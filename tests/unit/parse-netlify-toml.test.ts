import { describe, expect, it } from 'vitest';
import { parseNetlifyTomlRedirects } from '../../src/redirects/parse-netlify-toml.js';
import { parseRedirectDocument } from '../../src/redirects/parse-redirect-document.js';

const toml = `
[build]
  command = "pnpm build"

# legacy blog
[[redirects]]
  from = "/old-blog/*"
  to = "/blog/:splat"
  status = 301
  force = true

[[redirects]]
  from = "/home"
  to = "/"

[[headers]]
  for = "/*"
`;

describe('parseNetlifyTomlRedirects', () => {
  it('reads redirect tables and ignores other tables', () => {
    const rules = parseNetlifyTomlRedirects(toml);
    expect(rules).toEqual([
      {
        from: '/old-blog/*',
        to: '/blog/:splat',
        status: 301,
        force: true,
        query: [],
        conditions: [],
      },
      {
        from: '/home',
        to: '/',
        status: null,
        force: false,
        query: [],
        conditions: [],
      },
    ]);
  });

  it('selects the toml parser from the filename', () => {
    expect(parseRedirectDocument('from = "/a"\n', 'netlify.toml')).toEqual([]);
    expect(parseRedirectDocument('/a /b\n', '_redirects')[0]).toMatchObject({ from: '/a', to: '/b' });
  });
});
