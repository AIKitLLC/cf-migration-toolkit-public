export function tokenizeRedirectsLine(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: string | null = null;
  for (let index = 0; index < line.length; index += 1) {
    const ch = line[index];
    if (ch === undefined) break;
    if (quote) {
      if (ch === '\\' && index + 1 < line.length) {
        const escaped = line[index + 1];
        if (escaped !== undefined) current += escaped;
        index += 1;
        continue;
      }
      if (ch === quote) {
        quote = null;
        continue;
      }
      current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ' ' || ch === '\t') {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    if (ch === '#' && current.length === 0) return tokens;
    current += ch;
  }
  if (current) tokens.push(current);
  return tokens;
}
