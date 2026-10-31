import { parseTomlScalar } from './parse-toml-scalar.js';

export function parseInlineTomlTable(raw: string): Record<string, string[]> | null {
  const value = raw.trim();
  if (!value.startsWith('{') || !value.endsWith('}')) return null;
  const body = value.slice(1, -1).trim();
  if (!body) return {};
  const entries: Record<string, string[]> = {};
  for (const part of splitTopLevel(body, ',')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    const rawValue = part.slice(separator + 1).trim();
    if (!key || !rawValue) continue;
    entries[key] = rawValue.startsWith('[') ? parseStringArray(rawValue) : [parseTomlScalar(rawValue)];
  }
  return entries;
}

function parseStringArray(raw: string): string[] {
  const body = raw.trim().replace(/^\[/, '').replace(/\]$/, '').trim();
  if (!body) return [];
  return splitTopLevel(body, ',')
    .map((item) => parseTomlScalar(item.trim()))
    .filter((item) => item.length > 0);
}

export function splitTopLevel(value: string, separator: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote: string | null = null;
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const ch = value[index];
    if (ch === undefined) break;
    if (quote) {
      current += ch;
      if (ch === '\\' && quote === '"') {
        const escaped = value[index + 1];
        if (escaped !== undefined) {
          current += escaped;
          index += 1;
        }
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '{' || ch === '[') depth += 1;
    if ((ch === '}' || ch === ']') && depth > 0) depth -= 1;
    if (ch === separator && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}
