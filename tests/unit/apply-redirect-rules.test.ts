import { describe, expect, it } from 'vitest';
import { applyRedirectRules } from '../../src/demo/apply-redirect-rules.js';
import { parseRedirectsFile } from '../../src/redirects/parse-redirects-file.js';

describe('applyRedirectRules', () => {
  const rules = parseRedirectsFile('/old-blog/* /blog/:splat\n/posts/:id /blog/:id 301\n');

  it('uses the caller default when the rule has no status', () => {
    const applied = applyRedirectRules('/old-blog/sample', new URLSearchParams(), rules, 302);
    expect(applied).toEqual({ status: 302, target: '/blog/sample' });
  });

  it('keeps an explicit status', () => {
    const applied = applyRedirectRules('/posts/sample', new URLSearchParams(), rules, 302);
    expect(applied).toEqual({ status: 301, target: '/blog/sample' });
  });

  it('returns null when nothing matches', () => {
    expect(applyRedirectRules('/blog/sample', new URLSearchParams(), rules, 301)).toBeNull();
  });
});
