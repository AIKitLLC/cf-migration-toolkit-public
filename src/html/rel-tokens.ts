export function relTokens(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}
