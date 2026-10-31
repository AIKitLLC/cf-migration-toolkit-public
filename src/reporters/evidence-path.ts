import { basename, dirname, join } from 'node:path';

const STAMPED = /-\d{8}T\d{6}Z(?:\.[^./\\]+)?$/;

export function formatEvidenceStamp(now: Date): string {
  const year = now.getUTCFullYear().toString().padStart(4, '0');
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(now.getUTCHours()).padStart(2, '0');
  const minute = String(now.getUTCMinutes()).padStart(2, '0');
  const second = String(now.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

export function timestampedEvidencePath(filePath: string, now = new Date()): string {
  const segments = filePath.split(/[/\\]/).filter((segment) => segment.length > 0);
  const evidenceAt = segments.indexOf('evidence');
  if (evidenceAt < 0 || segments[evidenceAt + 1] !== 'live') return filePath;
  const name = basename(filePath);
  if (STAMPED.test(name)) return filePath;
  const stamp = formatEvidenceStamp(now);
  const dot = name.lastIndexOf('.');
  const stamped = dot <= 0 ? `${name}-${stamp}` : `${name.slice(0, dot)}-${stamp}${name.slice(dot)}`;
  return join(dirname(filePath), stamped);
}
