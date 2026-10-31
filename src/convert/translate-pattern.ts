export interface TranslatedPattern {
  ok: true;
  value: string;
}

export interface PatternFailure {
  ok: false;
}

export type PatternResult = TranslatedPattern | PatternFailure;

export function translateEndpoint(
  pattern: string,
  side: 'source' | 'destination',
  platform: 'netlify' | 'vercel',
): PatternResult {
  if (!pattern || /\s/.test(pattern)) return { ok: false };
  if (side === 'source' && (pattern.includes('?') || pattern.includes('#'))) return { ok: false };
  let value = pattern;
  if (platform === 'vercel' && (value === '/(.*)' || value === '(.*)')) value = '/*';
  if (/:([A-Za-z][A-Za-z0-9_]*)\+/.test(value)) return { ok: false };
  const catchAlls = value.match(/:([A-Za-z][A-Za-z0-9_]*)\*/g) ?? [];
  if (catchAlls.length > 1) return { ok: false };
  value = side === 'source'
    ? value.replace(/:([A-Za-z][A-Za-z0-9_]*)\*/g, '*')
    : value.replace(/:([A-Za-z][A-Za-z0-9_]*)\*/g, ':splat');
  if (side === 'source') value = value.replaceAll(':splat', '*');
  if (side === 'destination' && value.includes('*') && !value.includes(':splat')) {
    value = value.replace('*', ':splat');
  }
  if (/[()[\]]/.test(value)) return { ok: false };
  if (splatMarkerCount(value) > 1) return { ok: false };
  const star = value.indexOf('*');
  if (star !== -1 && star !== value.length - 1) return { ok: false };
  if (side === 'source' && value.includes(':splat')) return { ok: false };
  if (!placeholdersAreValid(value, side)) return { ok: false };
  return { ok: true, value };
}

export function isDynamicPattern(source: string, destination: string): boolean {
  return hasSplatOrPlaceholder(source) || hasSplatOrPlaceholder(destination);
}

function hasSplatOrPlaceholder(value: string): boolean {
  return value.includes('*') || /:[A-Za-z]/.test(value);
}

function splatMarkerCount(value: string): number {
  return value.split('*').length - 1 + (value.split(':splat').length - 1);
}

function placeholdersAreValid(value: string, side: 'source' | 'destination'): boolean {
  const withoutSplatRef = side === 'destination' ? value.replaceAll(':splat', '') : value;
  const names: string[] = [];
  for (const match of withoutSplatRef.matchAll(/:([A-Za-z][A-Za-z0-9_]*)/g)) {
    const name = match[1];
    if (!name) return false;
    names.push(name);
  }
  return new Set(names).size === names.length;
}
