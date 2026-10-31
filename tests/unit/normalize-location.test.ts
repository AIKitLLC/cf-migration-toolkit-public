import { describe, expect, it } from 'vitest';
import { normalizeLocation } from '../../src/normalize/normalize-location.js';
import { requestPath } from '../../src/normalize/request-path.js';
import { pathsFromUrlList } from '../../src/url-sources/paths-from-url-list.js';

describe('normalizeLocation', () => {
  const oldOrigin = new URL('https://old.example');
  const newOrigin = new URL('https://new.example');

  it('resolves a relative location and swaps the old host for the new host', () => {
    const normalized = normalizeLocation('/blog/sample', 'https://old.example/old-blog/sample', oldOrigin, newOrigin);
    expect(normalized).toBe('https://new.example/blog/sample');
  });

  it('leaves an external host alone', () => {
    const normalized = normalizeLocation('https://other.example/a', 'https://old.example/', oldOrigin, newOrigin);
    expect(normalized).toBe('https://other.example/a');
  });

  it('drops the fragment and a default port', () => {
    const normalized = normalizeLocation(
      'http://old.example:80/a#section',
      'http://old.example/a',
      new URL('http://old.example'),
      new URL('http://new.example'),
    );
    expect(normalized).toBe('http://new.example/a');
  });
});

describe('request paths', () => {
  it('keeps the path and query from an absolute URL', () => {
    expect(requestPath('https://example.com/c?x=1')).toBe('/c?x=1');
  });

  it('skips comments and blank lines in a URL list', () => {
    expect(pathsFromUrlList('# note\n\n/a\nhttps://example.com/b\n')).toEqual(['/a', '/b']);
  });
});
