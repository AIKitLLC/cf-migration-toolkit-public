import { stripTomlComment } from './strip-toml-comment.js';

export interface LogicalTomlLine {
  line: number;
  text: string;
}

export function readLogicalTomlLines(text: string): LogicalTomlLine[] {
  const lines = text.split(/\r?\n/);
  const logical: LogicalTomlLine[] = [];
  let buffer = '';
  let startLine = 1;
  for (let index = 0; index < lines.length; index += 1) {
    const stripped = stripTomlComment(lines[index] ?? '').trim();
    if (!buffer && !stripped) continue;
    if (!buffer) startLine = index + 1;
    buffer = buffer ? `${buffer} ${stripped}` : stripped;
    if (braceDepth(buffer) > 0) continue;
    if (buffer) logical.push({ line: startLine, text: buffer });
    buffer = '';
  }
  if (buffer) logical.push({ line: startLine, text: buffer });
  return logical;
}

function braceDepth(value: string): number {
  let depth = 0;
  let quote: string | null = null;
  for (let index = 0; index < value.length; index += 1) {
    const ch = value[index];
    if (ch === undefined) break;
    if (quote) {
      if (ch === '\\' && quote === '"') {
        index += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '{' || ch === '[') depth += 1;
    if ((ch === '}' || ch === ']') && depth > 0) depth -= 1;
  }
  return depth;
}
