export function stripTomlComment(line: string): string {
  let quote: string | null = null;
  for (let index = 0; index < line.length; index += 1) {
    const ch = line[index];
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
    if (ch === '#') return line.slice(0, index);
  }
  return line;
}
