import { describe, expect, it } from 'vitest';
import { parseNetlifyConfig } from '../../src/redirects/parse-netlify-config.js';

const toml = `
[[redirects]]
  from = "/old-blog/*"
  to = "/blog/:splat"
  force = true

[[redirects]]
  from = "/shop"
  to = "/item/:id"
  status = 301
  query = {id = ":id"}
  conditions = {Language = ["en"], Country = ["US"], Role = ["admin"]}

[[redirects]]
  from = "/search"
  to = "https://api.example.com"
  status = 200
  signed = "API_TOKEN"
  [redirects.headers]
    X-From = "Netlify"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
`;

describe('parseNetlifyConfig', () => {
  it('reads redirects, query, conditions, signed proxies, and header values', () => {
    const project = parseNetlifyConfig(toml, 'netlify.toml');
    expect(project.redirects.map((rule) => ({
      from: rule.from,
      to: rule.to,
      status: rule.status,
      force: rule.force,
      conditions: rule.conditions,
      signed: rule.signed,
      proxyRequestHeaders: rule.proxyRequestHeaders,
    }))).toEqual([
      {
        from: '/old-blog/*',
        to: '/blog/:splat',
        status: null,
        force: true,
        conditions: [],
        signed: false,
        proxyRequestHeaders: false,
      },
      {
        from: '/shop',
        to: '/item/:id',
        status: 301,
        force: false,
        conditions: [
          { kind: 'query', detail: 'id=:id' },
          { kind: 'language', detail: 'Language=en' },
          { kind: 'country', detail: 'Country=US' },
          { kind: 'role', detail: 'Role=admin' },
        ],
        signed: false,
        proxyRequestHeaders: false,
      },
      {
        from: '/search',
        to: 'https://api.example.com',
        status: 200,
        force: false,
        conditions: [],
        signed: true,
        proxyRequestHeaders: true,
      },
    ]);
    expect(project.headers).toEqual([
      {
        location: { file: 'netlify.toml', line: expect.any(Number) },
        platform: 'netlify',
        path: '/*',
        headers: [{ name: 'X-Frame-Options', value: 'DENY' }],
        conditions: [],
      },
    ]);
  });
});
