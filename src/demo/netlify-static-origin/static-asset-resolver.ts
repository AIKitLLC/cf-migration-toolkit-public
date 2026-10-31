import { existsSync, statSync } from 'node:fs';
import { join, normalize, sep } from 'node:path';

export const HTML_CANONICAL_REDIRECT_STATUS = 307;

export type AssetHit =
  | { kind: 'file'; absolutePath: string }
  | { kind: 'redirect'; pathname: string; status: number }
  | { kind: 'missing' };

export class StaticAssetResolver {
  constructor(private readonly root: string) {}

  resolve(pathname: string): AssetHit {
    const relative = relativePath(pathname);
    if (relative === null) return { kind: 'missing' };
    if (relative === '') return this.file('index.html');
    const direct = this.safe(relative);
    if (!direct) return { kind: 'missing' };
    if (isFile(direct)) return { kind: 'file', absolutePath: direct };
    if (isDirectory(direct)) {
      const index = join(direct, 'index.html');
      if (isFile(index)) return { kind: 'file', absolutePath: index };
    }
    if (!relative.endsWith('.html')) {
      const html = this.safe(`${relative}.html`);
      if (html && isFile(html)) return { kind: 'file', absolutePath: html };
    }
    if (relative.endsWith('/')) {
      const trimmed = relative.slice(0, -1);
      const html = this.safe(`${trimmed}.html`);
      if (html && isFile(html)) {
        return { kind: 'redirect', pathname: `/${trimmed}`, status: HTML_CANONICAL_REDIRECT_STATUS };
      }
    }
    return { kind: 'missing' };
  }

  private file(relative: string): AssetHit {
    const absolutePath = this.safe(relative);
    if (!absolutePath || !isFile(absolutePath)) return { kind: 'missing' };
    return { kind: 'file', absolutePath };
  }

  private safe(relative: string): string | null {
    const absolutePath = normalize(join(this.root, relative));
    const root = normalize(this.root);
    if (absolutePath !== root && !absolutePath.startsWith(root + sep)) return null;
    return absolutePath;
  }
}

function relativePath(pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  return decoded.replace(/^\/+/, '');
}

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}
