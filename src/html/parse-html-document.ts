import { parse, type HTMLElement } from 'node-html-parser';

export function parseHtmlDocument(html: string): HTMLElement {
  return parse(html);
}
