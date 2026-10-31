export function normalizeHeaderValue(name: string, value: string): string {
  const collapsed = value.trim().replace(/\s+/g, ' ');
  if (name === 'content-type') {
    return collapsed.toLowerCase().replace(/\s*;\s*/g, ';').replace(/\s*=\s*/g, '=');
  }
  if (name === 'cache-control' || name === 'x-robots-tag') {
    return collapsed
      .toLowerCase()
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .sort()
      .join(', ');
  }
  if (name === 'content-security-policy') {
    return collapsed;
  }
  return collapsed.toLowerCase();
}

export function headerValuesEqual(name: string, left: string, right: string): boolean {
  return normalizeHeaderValue(name, left) === normalizeHeaderValue(name, right);
}
