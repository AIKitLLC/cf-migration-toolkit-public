import { describe, expect, it } from 'vitest';
import { expandRuleSource } from '../../src/redirects/expand-rule-source.js';
import type { RedirectRule } from '../../src/redirects/redirect-rule.js';

function rule(partial: Partial<RedirectRule> & Pick<RedirectRule, 'from' | 'to'>): RedirectRule {
  return {
    status: null,
    force: false,
    query: [],
    conditions: [],
    ...partial,
  };
}

describe('expandRuleSource', () => {
  it('replaces a splat star with one sample segment', () => {
    expect(expandRuleSource(rule({ from: '/old-blog/*', to: '/blog/:splat' }))).toBe('/old-blog/sample');
  });

  it('replaces named placeholders and query values', () => {
    expect(
      expandRuleSource(
        rule({
          from: '/articles/:year/:slug',
          to: '/blog/:year/:slug',
          query: ['id=:id'],
        }),
      ),
    ).toBe('/articles/sample/sample?id=sample');
  });

  it('uses the pathname of an absolute source', () => {
    expect(
      expandRuleSource(rule({ from: 'https://old.example/old-blog/*', to: '/blog/:splat' })),
    ).toBe('/old-blog/sample');
  });

  it('turns a bare star into /sample', () => {
    expect(expandRuleSource(rule({ from: '/*', to: '/index.html' }))).toBe('/sample');
  });
});
