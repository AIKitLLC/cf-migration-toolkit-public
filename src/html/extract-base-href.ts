import type { HTMLElement } from 'node-html-parser';

export function extractBaseHref(root: HTMLElement): string | null {
  const href = root.querySelector('base')?.getAttribute('href')?.trim();
  return href ? href : null;
}
