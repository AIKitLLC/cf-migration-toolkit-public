import type { HTMLElement } from 'node-html-parser';

export function extractAnchorHrefs(root: HTMLElement): string[] {
  const hrefs: string[] = [];
  for (const element of root.querySelectorAll('a')) {
    const href = element.getAttribute('href')?.trim();
    if (href) hrefs.push(href);
  }
  return hrefs;
}
