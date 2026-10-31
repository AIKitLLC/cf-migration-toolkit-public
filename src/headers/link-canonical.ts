export function linkHeaderCanonicals(header: string | null): string[] {
  if (!header) return [];
  const urls: string[] = [];
  for (const part of splitTopLevelCommas(header)) {
    const target = /<([^>]+)>/.exec(part);
    const href = target?.[1]?.trim();
    if (!href) continue;
    if (!relTokens(part).includes('canonical')) continue;
    urls.push(href);
  }
  return urls;
}

function relTokens(part: string): string[] {
  const match = /(?:^|;)\s*rel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^;\s]+))/i.exec(part);
  const value = match?.[1] ?? match?.[2] ?? match?.[3] ?? '';
  return value.toLowerCase().split(/\s+/).filter((token) => token.length > 0);
}

function splitTopLevelCommas(header: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inAngles = false;
  let quote: string | null = null;
  for (const ch of header) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '<') inAngles = true;
    if (ch === '>') inAngles = false;
    if (ch === ',' && !inAngles) {
      if (current.trim()) parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}
