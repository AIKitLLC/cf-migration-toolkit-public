import { describe, expect, it } from 'vitest';
import { convertProject } from '../../src/convert/rule-converter.js';
import { migrationFromRedirectsFile } from '../../src/redirects/migration-from-redirects-file.js';
import { parseVercelConfig } from '../../src/redirects/parse-vercel-config.js';

describe('convertProject status codes', () => {
  it('writes an explicit 301 for a Netlify rule with no code', () => {
    const draft = convertProject(migrationFromRedirectsFile('/old-blog/* /blog/:splat\n', '_redirects'));
    expect(draft.unsupported).toEqual([]);
    expect(draft.redirects[0]).toMatchObject({
      output: '/old-blog/* /blog/:splat 301',
      status: 301,
      statusOrigin: 'netlify-default',
      dynamic: true,
    });
    expect(draft.redirects[0]?.caveat).toMatch(/always applies/);
  });

  it('keeps a forced Netlify redirect because Cloudflare always applies _redirects', () => {
    const draft = convertProject(migrationFromRedirectsFile('/old /new 301!\n', '_redirects'));
    expect(draft.unsupported).toEqual([]);
    expect(draft.redirects[0]).toMatchObject({ output: '/old /new 301', caveat: null });
  });

  it('uses 308 when vercel permanent is omitted and 307 when it is false', () => {
    const draft = convertProject(parseVercelConfig(JSON.stringify({
      redirects: [
        { source: '/old/:path*', destination: '/new/:path*' },
        { source: '/temp', destination: '/new', permanent: false },
        { source: '/both', destination: '/new', permanent: false, statusCode: 301 },
      ],
    }), 'vercel.json'));
    expect(draft.redirects.map((rule) => rule.output)).toEqual([
      '/temp /new 307',
      '/both /new 301',
      '/old/* /new/:splat 308',
    ]);
    expect(draft.redirects.map((rule) => rule.statusOrigin)).toEqual([
      'vercel-temporary',
      'explicit',
      'vercel-permanent',
    ]);
  });

  it('lists a cookie condition as unsupported and points at Redirect Rules', () => {
    const draft = convertProject(migrationFromRedirectsFile('/preview/* /preview/:splat 302 Cookie=preview\n', '_redirects'));
    expect(draft.redirects).toEqual([]);
    expect(draft.unsupported[0]).toMatchObject({
      reasons: ['cookie'],
      alternative: 'redirect-rules',
    });
  });

  it('translates named placeholders', () => {
    const draft = convertProject(migrationFromRedirectsFile('/blog/:year/:slug /news/:year/:slug\n', '_redirects'));
    expect(draft.redirects[0]?.output).toBe('/blog/:year/:slug /news/:year/:slug 301');
    expect(draft.redirects[0]?.dynamic).toBe(true);
  });
});
