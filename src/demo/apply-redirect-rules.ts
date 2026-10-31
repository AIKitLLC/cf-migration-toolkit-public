import type { RedirectRule } from '../redirects/redirect-rule.js';

export interface AppliedRedirect {
  status: number;
  target: string;
}

export function applyRedirectRules(
  pathname: string,
  searchParams: URLSearchParams,
  rules: readonly RedirectRule[],
  defaultStatus: number,
): AppliedRedirect | null {
  for (const rule of rules) {
    const captures = matchRule(pathname, searchParams, rule);
    if (!captures) continue;
    return {
      status: rule.status ?? defaultStatus,
      target: substitute(rule.to, captures),
    };
  }
  return null;
}

function matchRule(pathname: string, searchParams: URLSearchParams, rule: RedirectRule): Map<string, string> | null {
  const path = rule.from.includes('://') ? new URL(rule.from).pathname : rule.from.split('?')[0] ?? rule.from;
  const compiled = compilePattern(path);
  const match = compiled.regex.exec(pathname);
  if (!match) return null;
  const captures = new Map<string, string>();
  compiled.names.forEach((name, index) => {
    captures.set(name, match[index + 1] ?? '');
  });
  for (const pair of rule.query) {
    const separator = pair.indexOf('=');
    if (separator === -1) return null;
    const key = pair.slice(0, separator);
    const actual = searchParams.get(key);
    if (actual === null || !compilePattern(pair.slice(separator + 1)).regex.test(actual)) return null;
  }
  return captures;
}

function substitute(target: string, captures: ReadonlyMap<string, string>): string {
  return target.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_match, name: string) => captures.get(name) ?? '');
}

function compilePattern(pattern: string): { regex: RegExp; names: string[] } {
  const names: string[] = [];
  let source = '^';
  const token = /(:([A-Za-z_][A-Za-z0-9_]*)|\*)/g;
  let last = 0;
  for (const match of pattern.matchAll(token)) {
    const index = match.index ?? 0;
    source += escapeRegExp(pattern.slice(last, index));
    if (match[1] === '*') {
      names.push('splat');
      source += '(.*)';
    } else if (match[2]) {
      names.push(match[2]);
      source += '([^/]+)';
    }
    last = index + match[0].length;
  }
  source += escapeRegExp(pattern.slice(last));
  source += '$';
  return { regex: new RegExp(source), names };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
