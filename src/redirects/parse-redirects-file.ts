import type { RedirectRule } from './redirect-rule.js';
import { tokenizeRedirectsLine } from './tokenize-redirects-line.js';

const STATUS_TOKEN = /^(\d{3})(!)?$/;
const KNOWN_CONDITIONS = /^(country|language|role|cookie)=/i;

export interface LocatedRedirectRule {
  line: number;
  rule: RedirectRule;
}

export function parseRedirectsFile(text: string): RedirectRule[] {
  return parseLocatedRedirectRules(text).map((entry) => entry.rule);
}

export function parseLocatedRedirectRules(text: string): LocatedRedirectRule[] {
  const rules: LocatedRedirectRule[] = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] ?? '';
    const tokens = tokenizeRedirectsLine(raw.trim());
    if (tokens.length === 0) continue;
    const rule = ruleFromTokens(tokens, index + 1);
    if (rule) rules.push({ line: index + 1, rule });
  }
  return rules;
}

function ruleFromTokens(tokens: readonly string[], lineNumber: number): RedirectRule | null {
  const from = tokens[0];
  if (!from || tokens.length < 2) {
    throw new Error(`Redirect rule on line ${lineNumber} needs a source and a target`);
  }
  let cursor = 1;
  const query: string[] = [];
  while (cursor < tokens.length && isQueryToken(tokens[cursor])) {
    const token = tokens[cursor];
    if (token) query.push(token);
    cursor += 1;
  }
  const to = tokens[cursor];
  if (!to || !isTargetToken(to)) {
    throw new Error(`Redirect rule on line ${lineNumber} is missing a target`);
  }
  cursor += 1;
  let status: number | null = null;
  let force = false;
  const statusToken = tokens[cursor];
  if (statusToken) {
    const match = STATUS_TOKEN.exec(statusToken);
    if (match?.[1]) {
      status = Number(match[1]);
      force = match[2] === '!';
      cursor += 1;
    }
  }
  const conditions = tokens.slice(cursor).filter((token): token is string => token !== undefined);
  return { from, to, status, force, query, conditions };
}

function isQueryToken(token: string | undefined): boolean {
  if (!token || !token.includes('=') || isTargetToken(token)) return false;
  return !KNOWN_CONDITIONS.test(token);
}

function isTargetToken(token: string): boolean {
  return token.startsWith('/') || token.startsWith('http://') || token.startsWith('https://');
}
