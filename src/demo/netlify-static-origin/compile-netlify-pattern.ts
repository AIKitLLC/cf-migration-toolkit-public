const TOKEN = /\*|:[A-Za-z_][A-Za-z0-9_]*/g;

export class NetlifyPattern {
  constructor(
    private readonly regex: RegExp,
    private readonly groups: readonly string[],
  ) {}

  match(pathname: string): readonly string[] | null {
    const found = this.regex.exec(pathname);
    if (!found) return null;
    return found.slice(1);
  }

  substitute(destination: string, captures: readonly string[]): string {
    let result = destination;
    this.groups.forEach((name, index) => {
      const value = captures[index] ?? '';
      if (name === 'splat') {
        result = result.replaceAll(':splat', value);
        return;
      }
      result = result.replaceAll(`:${name}`, value);
    });
    return result;
  }
}

export function compileNetlifyPattern(pattern: string): NetlifyPattern {
  const groups: string[] = [];
  let source = '^';
  let cursor = 0;
  for (const match of pattern.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    const token = match[0] ?? '';
    source += escapeRegex(pattern.slice(cursor, index));
    if (token === '*' || token === ':splat') {
      groups.push('splat');
      source += '(.*)';
    } else {
      groups.push(token.slice(1));
      source += '([^/]+)';
    }
    cursor = index + token.length;
  }
  source += escapeRegex(pattern.slice(cursor));
  source += '$';
  return new NetlifyPattern(new RegExp(source), groups);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
