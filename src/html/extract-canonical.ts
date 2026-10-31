import type { HTMLElement } from 'node-html-parser';
import { relTokens } from './rel-tokens.js';

export function extractCanonicalHref(root: HTMLElement): string | null {
  for (const element of root.querySelectorAll('link')) {
    if (!relTokens(element.getAttribute('rel')).includes('canonical')) continue;
    const href = element.getAttribute('href')?.trim();
    if (href) return href;
  }
  return null;
}
