export function isDomainLevelSource(from: string): boolean {
  const path = from.split('?')[0] ?? from;
  if (path.startsWith('http://') || path.startsWith('https://')) return true;
  if (path.startsWith('/')) return false;
  return path.includes('.');
}

export function isRelativeDestination(destination: string): boolean {
  return destination.startsWith('/') && !destination.startsWith('//');
}

export function sourcePath(from: string): string {
  const separator = from.indexOf('?');
  return separator === -1 ? from : from.slice(0, separator);
}
