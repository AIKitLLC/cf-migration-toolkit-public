import { describe, expect, it } from 'vitest';
import { assertCloudflareLimits } from '../../src/convert/assert-cloudflare-limits.js';
import { DYNAMIC_REDIRECT_LIMIT, HEADER_RULE_LIMIT, STATIC_REDIRECT_LIMIT } from '../../src/convert/cloudflare-limits.js';
import { convertProject } from '../../src/convert/rule-converter.js';
import { emptyMigrationProject } from '../../src/redirects/migration-document.js';
import type { MigrationProject } from '../../src/redirects/migration-document.js';

describe('Cloudflare _redirects and _headers limits', () => {
  it('fails when dynamic redirects exceed 100 and names Bulk Redirects', () => {
    const project = emptyMigrationProject();
    for (let index = 0; index <= DYNAMIC_REDIRECT_LIMIT; index += 1) {
      project.redirects.push(netlifyRedirect(`/p${index}/*`, '/to/:splat'));
    }
    expect(() => assertCloudflareLimits(convertProject(project))).toThrow(/Bulk Redirects/);
  });

  it('fails when static redirects exceed 2000 and names Bulk Redirects', () => {
    const project = emptyMigrationProject();
    for (let index = 0; index <= STATIC_REDIRECT_LIMIT; index += 1) {
      project.redirects.push(netlifyRedirect(`/p${index}`, '/to'));
    }
    expect(() => assertCloudflareLimits(convertProject(project))).toThrow(/2000 static redirects/);
  });

  it('fails when one redirect line exceeds 1000 characters', () => {
    const project = emptyMigrationProject();
    project.redirects.push(netlifyRedirect(`/${'a'.repeat(1000)}`, '/b'));
    expect(() => assertCloudflareLimits(convertProject(project))).toThrow(/1000 characters per rule/);
  });

  it('fails when header rules exceed 100', () => {
    const project = headerProject(HEADER_RULE_LIMIT + 1, 'x');
    expect(() => assertCloudflareLimits(convertProject(project))).toThrow(/100 rules/);
  });

  it('fails when a header line exceeds 2000 characters', () => {
    const project = headerProject(1, 'v'.repeat(2000));
    expect(() => assertCloudflareLimits(convertProject(project))).toThrow(/2000 characters per line/);
  });
});

function netlifyRedirect(from: string, to: string): MigrationProject['redirects'][number] {
  return {
    location: { file: '_redirects', line: 1 },
    platform: 'netlify',
    kind: 'redirect',
    from,
    to,
    status: 301,
    explicitStatus: true,
    permanent: null,
    force: true,
    conditions: [],
    signed: false,
    proxyRequestHeaders: false,
  };
}

function headerProject(count: number, value: string): MigrationProject {
  const project = emptyMigrationProject();
  for (let index = 0; index < count; index += 1) {
    project.headers.push({
      location: { file: '_headers', line: index + 1 },
      platform: 'netlify',
      path: `/p${index}`,
      headers: [{ name: 'X-Test', value }],
      conditions: [],
    });
  }
  return project;
}
