import { describe, expect, it } from 'vitest';
import { CanonicalComparator } from '../../src/comparators/canonical-comparator.js';
import { createComparators } from '../../src/comparators/create-comparators.js';
import { HeaderComparator } from '../../src/comparators/header-comparator.js';
import { RedirectStatusComparator } from '../../src/comparators/redirect-status-comparator.js';
import { RedirectTargetComparator } from '../../src/comparators/redirect-target-comparator.js';
import { RobotsMetaComparator } from '../../src/comparators/robots-meta-comparator.js';
import { runComparators } from '../../src/comparators/run-comparators.js';
import { StatusComparator } from '../../src/comparators/status-comparator.js';
import { classifyRedirectStatusChange } from '../../src/comparators/classify-redirect-status-change.js';
import { comparison, pageSnapshot, responseView } from '../support/make-snapshot.js';

function pair(oldStatus: number, newStatus: number, location: string | null = '/next') {
  return comparison({
    old: pageSnapshot({
      first: responseView({
        status: oldStatus,
        location,
        url: 'https://old.example/page',
      }),
    }),
    new: pageSnapshot({
      first: responseView({
        status: newStatus,
        location,
        url: 'https://new.example/page',
      }),
    }),
  });
}

const REDIRECT_CODES = [301, 302, 303, 307, 308] as const;

function redirectPairSeverity(oldStatus: number, newStatus: number): 'error' | 'warning' | null {
  if (oldStatus === newStatus) return null;
  const oldRedirect = (REDIRECT_CODES as readonly number[]).includes(oldStatus);
  const newRedirect = (REDIRECT_CODES as readonly number[]).includes(newStatus);
  if (oldRedirect !== newRedirect) return 'error';
  if (!oldRedirect) return null;
  const permanent = oldStatus === 301 || oldStatus === 308;
  const nonPermanent = newStatus === 302 || newStatus === 303 || newStatus === 307;
  if (permanent && nonPermanent) return 'error';
  return 'warning';
}

const redirectStatusCases = [
  ...REDIRECT_CODES.flatMap((oldStatus) =>
    REDIRECT_CODES.map((newStatus) => ({
      oldStatus,
      newStatus,
      severity: redirectPairSeverity(oldStatus, newStatus),
    })),
  ),
  ...REDIRECT_CODES.map((oldStatus) => ({ oldStatus, newStatus: 200, severity: 'error' as const })),
  ...REDIRECT_CODES.map((newStatus) => ({ oldStatus: 200, newStatus, severity: 'error' as const })),
  { oldStatus: 200, newStatus: 404, severity: null },
];

describe('redirect status', () => {
  const comparator = new RedirectStatusComparator();

  it.each(redirectStatusCases)('$oldStatus -> $newStatus is $severity', ({ oldStatus, newStatus, severity }) => {
    expect(classifyRedirectStatusChange(oldStatus, newStatus)).toBe(severity);
    const findings = comparator.compare(pair(oldStatus, newStatus));
    if (severity === null) {
      expect(findings).toEqual([]);
      return;
    }
    expect(findings).toEqual([
      {
        path: '/page',
        check: 'redirect-status-changed',
        severity,
        old: String(oldStatus),
        new: String(newStatus),
      },
    ]);
  });

  it.each([
    [301, 302],
    [301, 307],
    [308, 302],
    [308, 307],
    [301, 303],
    [308, 303],
    [301, 200],
    [200, 301],
    [200, 302],
    [200, 303],
    [200, 307],
    [200, 308],
  ])('createComparators reports an error for %s -> %s when the location matches', (oldStatus, newStatus) => {
    const findings = runComparators(createComparators(), pair(oldStatus, newStatus));
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          check: 'redirect-status-changed',
          severity: 'error',
          old: String(oldStatus),
          new: String(newStatus),
        }),
      ]),
    );
  });
});

describe('status changes', () => {
  const comparator = new StatusComparator();

  it('is an error when 200 becomes 4xx or 5xx', () => {
    const findings = comparator.compare(pair(200, 500, null));
    expect(findings).toEqual([
      { path: '/page', check: 'status-changed', severity: 'error', old: '200', new: '500' },
    ]);
  });

  it('warns for other status changes, including a redirect downgrade', () => {
    expect(comparator.compare(pair(301, 302))[0]).toMatchObject({ severity: 'warning', old: '301', new: '302' });
    expect(comparator.compare(pair(404, 200, null))[0]?.severity).toBe('warning');
  });

  it('reports a different final status after the redirect chain', () => {
    const input = comparison({
      old: pageSnapshot({
        first: responseView({ status: 301, location: '/ok', url: 'https://old.example/page' }),
        final: responseView({ status: 200, url: 'https://old.example/ok' }),
        hops: 1,
      }),
      new: pageSnapshot({
        first: responseView({ status: 301, location: '/ok', url: 'https://new.example/page' }),
        final: responseView({ status: 404, url: 'https://new.example/ok' }),
        hops: 1,
      }),
    });
    expect(comparator.compare(input)).toEqual([
      { path: '/page', check: 'status-changed', severity: 'error', old: '200', new: '404' },
    ]);
  });
});

describe('redirect targets', () => {
  const comparator = new RedirectTargetComparator();

  it('treats the same path on each origin as the same target', () => {
    expect(comparator.compare(pair(301, 301, '/blog/sample'))).toEqual([]);
  });

  it('is an error when the normalized target differs', () => {
    const input = comparison({
      old: pageSnapshot({
        first: responseView({
          status: 301,
          location: 'https://old.example/blog/a',
          url: 'https://old.example/old',
        }),
      }),
      new: pageSnapshot({
        first: responseView({
          status: 301,
          location: '/blog/b',
          url: 'https://new.example/old',
        }),
      }),
    });
    expect(comparator.compare(input)).toEqual([
      {
        path: '/page',
        check: 'redirect-target-changed',
        severity: 'error',
        old: 'https://new.example/blog/a',
        new: 'https://new.example/blog/b',
      },
    ]);
  });
});

describe('headers and robots', () => {
  const headers = new HeaderComparator();
  const robots = new RobotsMetaComparator();

  it('warns when an allowlisted header changes or disappears', () => {
    const input = comparison({
      old: pageSnapshot({
        first: responseView({
          status: 200,
          headers: { 'cache-control': 'public, max-age=60', 'x-frame-options': 'DENY' },
        }),
      }),
      new: pageSnapshot({
        first: responseView({
          status: 200,
          headers: { 'cache-control': 'no-store' },
        }),
      }),
    });
    const findings = headers.compare(input);
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ check: 'header-changed', severity: 'warning' }),
        expect.objectContaining({
          check: 'header-missing',
          severity: 'warning',
          old: 'x-frame-options: DENY',
          new: 'x-frame-options: (missing)',
        }),
      ]),
    );
  });

  it('ignores content-type casing and parameter spacing', () => {
    const input = comparison({
      old: pageSnapshot({
        first: responseView({ status: 200, headers: { 'content-type': 'text/html; charset=UTF-8' } }),
      }),
      new: pageSnapshot({
        first: responseView({ status: 200, headers: { 'content-type': 'text/html;charset=utf-8' } }),
      }),
    });
    expect(headers.compare(input)).toEqual([]);
  });

  it('is an error when x-robots-tag or meta robots involves noindex', () => {
    const headerInput = comparison({
      old: pageSnapshot({
        first: responseView({ status: 200, headers: { 'x-robots-tag': 'noindex' } }),
      }),
      new: pageSnapshot({
        first: responseView({ status: 200, headers: { 'x-robots-tag': 'index, follow' } }),
      }),
    });
    expect(headers.compare(headerInput)[0]).toMatchObject({ check: 'header-changed', severity: 'error' });

    const metaInput = comparison({
      old: pageSnapshot({ first: responseView({ status: 200 }) }),
      new: pageSnapshot({ first: responseView({ status: 200 }) }),
      oldHtml: { canonicalHref: null, metaRobots: 'index, follow', baseHref: null, anchorHrefs: [] },
      newHtml: { canonicalHref: null, metaRobots: 'noindex, nofollow', baseHref: null, anchorHrefs: [] },
    });
    expect(robots.compare(metaInput)[0]).toMatchObject({
      check: 'header-changed',
      severity: 'error',
      old: 'meta-robots: index, follow',
      new: 'meta-robots: noindex, nofollow',
    });
  });

  it('warns when robots changes without noindex', () => {
    const input = comparison({
      old: pageSnapshot({ first: responseView({ status: 200 }) }),
      new: pageSnapshot({ first: responseView({ status: 200 }) }),
      oldHtml: { canonicalHref: null, metaRobots: 'nofollow', baseHref: null, anchorHrefs: [] },
      newHtml: { canonicalHref: null, metaRobots: 'nosnippet', baseHref: null, anchorHrefs: [] },
    });
    expect(robots.compare(input)[0]?.severity).toBe('warning');
  });
});

describe('canonical', () => {
  const comparator = new CanonicalComparator();

  it('swaps the old host before comparing html canonicals', () => {
    const input = comparison({
      old: pageSnapshot({
        first: responseView({ status: 200, url: 'https://old.example/blog/sample', body: '<html>' }),
      }),
      new: pageSnapshot({
        first: responseView({ status: 200, url: 'https://new.example/blog/sample', body: '<html>' }),
      }),
      oldHtml: {
        canonicalHref: 'https://old.example/blog/sample',
        metaRobots: null,
        baseHref: null,
        anchorHrefs: [],
      },
      newHtml: {
        canonicalHref: 'https://new.example/blog/sample',
        metaRobots: null,
        baseHref: null,
        anchorHrefs: [],
      },
    });
    expect(comparator.compare(input)).toEqual([]);
  });

  it('is an error when the canonical path differs', () => {
    const input = comparison({
      old: pageSnapshot({ first: responseView({ status: 200, url: 'https://old.example/a' }) }),
      new: pageSnapshot({ first: responseView({ status: 200, url: 'https://new.example/a' }) }),
      oldHtml: { canonicalHref: '/a', metaRobots: null, baseHref: null, anchorHrefs: [] },
      newHtml: { canonicalHref: '/b', metaRobots: null, baseHref: null, anchorHrefs: [] },
    });
    expect(comparator.compare(input)[0]).toMatchObject({
      check: 'canonical-changed',
      severity: 'error',
      old: 'html: https://new.example/a',
      new: 'html: https://new.example/b',
    });
  });
});
