import type { HTMLElement } from 'node-html-parser';

export function extractMetaRobots(root: HTMLElement): string | null {
  for (const element of root.querySelectorAll('meta')) {
    const name = element.getAttribute('name');
    if (!name || name.toLowerCase() !== 'robots') continue;
    const content = element.getAttribute('content');
    if (content === undefined) return '';
    return content.trim();
  }
  return null;
}
