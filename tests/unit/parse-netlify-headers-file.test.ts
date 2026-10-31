import { describe, expect, it } from 'vitest';
import { parseNetlifyHeadersFile } from '../../src/redirects/parse-netlify-headers-file.js';

describe('parseNetlifyHeadersFile', () => {
  it('reads path blocks and skips comments', () => {
    const project = parseNetlifyHeadersFile(
      ['# comment', '/secure/page', '  X-Frame-Options: DENY', '', '/static/*', '\tCache-Control: public'].join('\n'),
      '_headers',
    );
    expect(project.headers).toEqual([
      {
        location: { file: '_headers', line: 2 },
        platform: 'netlify',
        path: '/secure/page',
        headers: [{ name: 'X-Frame-Options', value: 'DENY' }],
        conditions: [],
      },
      {
        location: { file: '_headers', line: 5 },
        platform: 'netlify',
        path: '/static/*',
        headers: [{ name: 'Cache-Control', value: 'public' }],
        conditions: [],
      },
    ]);
  });
});
