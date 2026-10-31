export function splitFlag(token: string): [string, string | undefined] {
  const eq = token.indexOf('=');
  if (!token.startsWith('--') || eq === -1) return [token, undefined];
  return [token.slice(0, eq), token.slice(eq + 1)];
}
