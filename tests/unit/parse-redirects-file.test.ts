import { describe, expect, it } from 'vitest';
import { parseRedirectsFile } from '../../src/redirects/parse-redirects-file.js';

describe('parseRedirectsFile', () => {
  it('reads a status-less splat rule', () => {
    const [rule] = parseRedirectsFile('/old-blog/* /blog/:splat\n');
    expect(rule).toMatchObject({
      from: '/old-blog/*',
      to: '/blog/:splat',
      status: null,
      force: false,
      query: [],
    });
  });

  it('reads an explicit status and a force marker', () => {
    const [rule] = parseRedirectsFile('/old /new 301!\n');
    expect(rule).toMatchObject({ from: '/old', to: '/new', status: 301, force: true });
  });

  it('keeps query placeholders and ignores role conditions', () => {
    const [rule] = parseRedirectsFile('/store id=:id /blog/:id 301 Role=admin\n');
    expect(rule).toMatchObject({
      from: '/store',
      to: '/blog/:id',
      status: 301,
      query: ['id=:id'],
      conditions: ['Role=admin'],
    });
  });

  it('skips blanks and comments and accepts quoted paths', () => {
    const rules = parseRedirectsFile('# comment\n\n"/my page" /new 302\n');
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({ from: '/my page', to: '/new', status: 302 });
  });

  it('rejects a rule with no target', () => {
    expect(() => parseRedirectsFile('/only-source\n')).toThrow(/line 1/);
  });
});
