import { describe, expect, it } from 'vitest';
import { parseVercelConfig } from '../../src/redirects/parse-vercel-config.js';

describe('parseVercelConfig', () => {
  it('reads redirects, rewrites, headers, trailingSlash, and cleanUrls', () => {
    const project = parseVercelConfig(
      JSON.stringify({
        redirects: [
          { source: '/old/:path*', destination: '/new/:path*' },
          { source: '/temp', destination: '/new', permanent: false },
          { source: '/legacy', destination: '/new', statusCode: 301, permanent: false },
          { source: '/geo', destination: '/uk', missing: [{ type: 'cookie', key: 'session' }] },
        ],
        rewrites: [{ source: '/app/:path*', destination: '/index.html' }],
        headers: [{ source: '/(.*)', headers: [{ key: 'X-Frame-Options', value: 'DENY' }] }],
        trailingSlash: false,
        cleanUrls: true,
        routes: [{ src: '/old', dest: '/new' }],
      }),
      'vercel.json',
    );
    expect(project.redirects.map((rule) => ({
      from: rule.from,
      status: rule.status,
      explicitStatus: rule.explicitStatus,
      permanent: rule.permanent,
      kind: rule.kind,
      conditions: rule.conditions,
    }))).toEqual([
      {
        from: '/old/:path*',
        status: null,
        explicitStatus: false,
        permanent: null,
        kind: 'redirect',
        conditions: [],
      },
      {
        from: '/temp',
        status: null,
        explicitStatus: false,
        permanent: false,
        kind: 'redirect',
        conditions: [],
      },
      {
        from: '/legacy',
        status: 301,
        explicitStatus: true,
        permanent: false,
        kind: 'redirect',
        conditions: [],
      },
      {
        from: '/geo',
        status: null,
        explicitStatus: false,
        permanent: null,
        kind: 'redirect',
        conditions: [{ kind: 'missing', detail: 'cookie:session' }],
      },
      {
        from: '/app/:path*',
        status: 200,
        explicitStatus: true,
        permanent: null,
        kind: 'rewrite',
        conditions: [],
      },
    ]);
    expect(project.headers[0]).toMatchObject({ platform: 'vercel', path: '/(.*)' });
    expect(project.behaviors.map((behavior) => behavior.name)).toEqual(['trailing-slash', 'clean-urls']);
    expect(project.notes).toHaveLength(1);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseVercelConfig('{', 'vercel.json')).toThrow(/JSON/);
  });
});
