import { describe, expect, it } from 'vitest';
import { HeaderComparator } from '../../src/comparators/header-comparator.js';
import { contentTypesEquivalent } from '../../src/headers/content-type-comparison.js';
import { HARDENING_HEADERS } from '../../src/headers/hardening-headers.js';
import { comparison, pageSnapshot, responseView } from '../support/make-snapshot.js';

const headers = new HeaderComparator();

function documentPair(oldHeaders: Record<string, string>, newHeaders: Record<string, string>, status = 200) {
  return comparison({
    old: pageSnapshot({ first: responseView({ status, headers: oldHeaders }) }),
    new: pageSnapshot({ first: responseView({ status, headers: newHeaders }) }),
  });
}

describe('hardening headers added on the new origin', () => {
  it.each(HARDENING_HEADERS)('records %s as header-added info', (name) => {
    const value = 'on';
    const findings = headers.compare(documentPair({}, { [name]: value }));
    expect(findings).toEqual([
      {
        path: '/page',
        check: 'header-added',
        severity: 'info',
        old: `${name}: (missing)`,
        new: `${name}: ${value}`,
      },
    ]);
  });

  it('flags a deindexing migration when noindex is added', () => {
    const findings = headers.compare(documentPair({}, { 'x-robots-tag': 'noindex' }));
    expect(findings).toEqual([
      {
        path: '/page',
        check: 'header-missing',
        severity: 'error',
        old: 'x-robots-tag: (missing)',
        new: 'x-robots-tag: noindex',
      },
    ]);
  });

  it('keeps a lost noindex as a header-missing error', () => {
    const findings = headers.compare(documentPair({ 'x-robots-tag': 'noindex' }, {}));
    expect(findings).toEqual([
      {
        path: '/page',
        check: 'header-missing',
        severity: 'error',
        old: 'x-robots-tag: noindex',
        new: 'x-robots-tag: (missing)',
      },
    ]);
  });

  it('keeps a noindex value change as a header-changed error', () => {
    const findings = headers.compare(
      documentPair({ 'x-robots-tag': 'noindex' }, { 'x-robots-tag': 'index, follow' }),
    );
    expect(findings[0]).toMatchObject({ check: 'header-changed', severity: 'error' });
  });

  it('still warns when a non-hardening header appears only on the new origin', () => {
    const findings = headers.compare(documentPair({}, { 'cache-control': 'no-store' }));
    expect(findings).toEqual([
      {
        path: '/page',
        check: 'header-missing',
        severity: 'warning',
        old: 'cache-control: (missing)',
        new: 'cache-control: no-store',
      },
    ]);
  });

  it('still warns when a hardening header other than robots disappears', () => {
    const findings = headers.compare(documentPair({ 'x-frame-options': 'DENY' }, {}));
    expect(findings[0]).toMatchObject({ check: 'header-missing', severity: 'warning' });
  });

  it('still warns when HSTS is present on both origins and the value is weaker', () => {
    const findings = headers.compare(
      documentPair(
        { 'strict-transport-security': 'max-age=31536000; includeSubDomains; preload' },
        { 'strict-transport-security': 'max-age=31536000' },
      ),
    );
    expect(findings).toEqual([
      {
        path: '/page',
        check: 'header-changed',
        severity: 'warning',
        old: 'strict-transport-security: max-age=31536000; includeSubDomains; preload',
        new: 'strict-transport-security: max-age=31536000',
      },
    ]);
  });
});

describe('content-type comparison', () => {
  it('matches media types without regard to case', () => {
    expect(contentTypesEquivalent('Text/HTML', 'text/html')).toBe(true);
    expect(headers.compare(documentPair({ 'content-type': 'Text/HTML' }, { 'content-type': 'text/html' }))).toEqual(
      [],
    );
  });

  it('treats text/html and text/html; charset=UTF-8 as equal when one side omits charset', () => {
    expect(contentTypesEquivalent('text/html; charset=UTF-8', 'text/html')).toBe(true);
    expect(contentTypesEquivalent('text/html', 'text/html; charset="utf-8"')).toBe(true);
    expect(
      headers.compare(
        documentPair({ 'content-type': 'text/html; charset=UTF-8' }, { 'content-type': 'text/html' }),
      ),
    ).toEqual([]);
  });

  it('warns when the media type differs', () => {
    const findings = headers.compare(
      documentPair({ 'content-type': 'text/html; charset=UTF-8' }, { 'content-type': 'text/plain' }),
    );
    expect(findings).toEqual([
      {
        path: '/page',
        check: 'header-changed',
        severity: 'warning',
        old: 'content-type: text/html; charset=UTF-8',
        new: 'content-type: text/plain',
      },
    ]);
  });

  it('warns when HTML drops a non-UTF-8 charset', () => {
    const findings = headers.compare(
      documentPair({ 'content-type': 'text/html; charset=iso-8859-1' }, { 'content-type': 'text/html' }),
    );
    expect(findings[0]).toMatchObject({ check: 'header-changed', severity: 'warning' });
  });

  it('ignores content-type on 3xx responses for both missing and changed', () => {
    expect(
      headers.compare(
        documentPair({ 'content-type': 'text/plain; charset=utf-8' }, {}, 301),
      ),
    ).toEqual([]);
    expect(
      headers.compare(
        documentPair({ 'content-type': 'text/plain' }, { 'content-type': 'text/html' }, 302),
      ),
    ).toEqual([]);
    expect(
      headers.compare(documentPair({}, { 'content-type': 'text/html' }, 308)),
    ).toEqual([]);
  });

  it('still compares the landing content-type after a redirect', () => {
    const input = comparison({
      old: pageSnapshot({
        first: responseView({ status: 301, headers: { 'content-type': 'text/plain' }, location: '/faq' }),
        final: responseView({ status: 200, headers: { 'content-type': 'text/html; charset=UTF-8' } }),
        hops: 1,
      }),
      new: pageSnapshot({
        first: responseView({ status: 301, headers: {}, location: '/faq' }),
        final: responseView({ status: 200, headers: { 'content-type': 'text/plain' } }),
        hops: 1,
      }),
    });
    expect(headers.compare(input)).toEqual([
      {
        path: '/page',
        check: 'header-changed',
        severity: 'warning',
        old: 'final content-type: text/html; charset=UTF-8',
        new: 'final content-type: text/plain',
      },
    ]);
  });
});
