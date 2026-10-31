import type { MigrationHeaderRule } from '../../redirects/migration-document.js';
import { compileNetlifyPattern } from './compile-netlify-pattern.js';

export function headerRulesForPath(
  rules: readonly MigrationHeaderRule[],
  pathname: string,
): ReadonlyMap<string, string> {
  const merged = new Map<string, string>();
  for (const rule of rules) {
    if (!compileNetlifyPattern(rule.path).match(pathname)) continue;
    for (const header of rule.headers) merged.set(header.name, header.value);
  }
  return merged;
}
