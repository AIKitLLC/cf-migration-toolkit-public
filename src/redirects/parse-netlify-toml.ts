import { parseTomlScalar } from './parse-toml-scalar.js';
import type { RedirectRule } from './redirect-rule.js';
import { stripTomlComment } from './strip-toml-comment.js';

const REDIRECTS_TABLE = /^\[\[\s*redirects\s*\]\]$/i;
const ANY_TABLE = /^\[\[?[^\]]+\]\]?$/;
const ASSIGNMENT = /^([A-Za-z0-9_-]+)\s*=\s*(.*)$/;

export function parseNetlifyTomlRedirects(text: string): RedirectRule[] {
  const rules: RedirectRule[] = [];
  let fields: Record<string, string> | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = stripTomlComment(rawLine).trim();
    if (!line) continue;
    if (ANY_TABLE.test(line)) {
      pushRule(rules, fields);
      fields = REDIRECTS_TABLE.test(line) ? {} : null;
      continue;
    }
    if (!fields) continue;
    const assignment = ASSIGNMENT.exec(line);
    const key = assignment?.[1];
    const rawValue = assignment?.[2];
    if (!key || rawValue === undefined) continue;
    fields[key] = parseTomlScalar(rawValue);
  }
  pushRule(rules, fields);
  return rules;
}

function pushRule(rules: RedirectRule[], fields: Record<string, string> | null): void {
  if (!fields?.from || !fields.to) return;
  const status = fields.status ? Number(fields.status) : null;
  rules.push({
    from: fields.from,
    to: fields.to,
    status: status !== null && Number.isInteger(status) ? status : null,
    force: fields.force === 'true',
    query: [],
    conditions: [],
  });
}
