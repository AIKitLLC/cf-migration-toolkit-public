import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const REPO_ROOT = repoRoot;
export const D1_ROOT = join(repoRoot, 'examples', 'd1-netlify-static-faq');
export const D1_SITE = join(D1_ROOT, 'site');
export const D1_DIST = join(D1_SITE, 'dist');
export const D1_TOML = join(D1_SITE, 'netlify.toml');
export const D1_CONVERSION = join(D1_ROOT, 'conversion');
export const D1_PARITY = join(D1_ROOT, 'parity');
export const D1_ROLLBACK = join(D1_ROOT, 'rollback');
export const D1_OLD_URLS = join(D1_ROOT, 'old-urls.txt');
export const D1_WRANGLER_CONFIG = join(D1_ROOT, 'wrangler.jsonc');

export const NETLIFY_PORT = 41751;
export const WRANGLER_PORT = 41752;
export const ROLLBACK_SWITCH_PORT = 41760;
export const ROLLBACK_V1_PORT = 41761;
export const ROLLBACK_V2_PORT = 41762;
