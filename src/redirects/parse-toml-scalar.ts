export function parseTomlScalar(raw: string): string {
  const value = raw.trim();
  if (value.startsWith('"')) return readBasicString(value);
  if (value.startsWith("'")) {
    const end = value.lastIndexOf("'");
    return end > 0 ? value.slice(1, end) : value.slice(1);
  }
  return value;
}

function readBasicString(value: string): string {
  let out = '';
  for (let index = 1; index < value.length; index += 1) {
    const ch = value[index];
    if (ch === undefined) break;
    if (ch === '\\') {
      const next = value[index + 1];
      if (next === undefined) break;
      const escapes: Record<string, string> = {
        n: '\n',
        t: '\t',
        r: '\r',
        '"': '"',
        '\\': '\\',
      };
      out += escapes[next] ?? next;
      index += 1;
      continue;
    }
    if (ch === '"') break;
    out += ch;
  }
  return out;
}
