import { conditionsFromToken } from './condition-kind.js';
import { emptyMigrationProject } from './migration-document.js';
import type { MatchCondition, MigrationProject, MigrationRedirect } from './migration-document.js';
import { parseLocatedRedirectRules } from './parse-redirects-file.js';
import type { RedirectRule } from './redirect-rule.js';

export function migrationFromRedirectsFile(text: string, file: string): MigrationProject {
  const project = emptyMigrationProject();
  for (const located of parseLocatedRedirectRules(text)) {
    project.redirects.push(redirectFromRule(located.rule, file, located.line));
  }
  return project;
}

function redirectFromRule(rule: RedirectRule, file: string, line: number): MigrationRedirect {
  const split = splitQuery(rule.from);
  const conditions: MatchCondition[] = [
    ...rule.query.map((pair) => ({ kind: 'query' as const, detail: pair })),
    ...rule.conditions.map(conditionsFromToken),
  ];
  if (split.query) conditions.push({ kind: 'query', detail: split.query });
  const status = rule.status;
  return {
    location: { file, line },
    platform: 'netlify',
    kind: status === 200 ? 'rewrite' : 'redirect',
    from: rule.from,
    to: rule.to,
    status,
    explicitStatus: status !== null,
    permanent: null,
    force: rule.force,
    conditions,
    signed: false,
    proxyRequestHeaders: false,
  };
}

function splitQuery(from: string): { query: string | undefined } {
  const separator = from.indexOf('?');
  if (separator === -1) return { query: undefined };
  return { query: from.slice(separator + 1) };
}
