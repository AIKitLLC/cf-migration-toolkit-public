export interface ParagraphBlock {
  kind: 'paragraph';
  text: string;
}

export interface ItemsBlock {
  kind: 'items';
  intro?: string;
  items: readonly string[];
}

export interface TableBlock {
  kind: 'table';
  rows: readonly (readonly string[])[];
}

export type QuoteBlock = ParagraphBlock | ItemsBlock | TableBlock;

export interface Quotation {
  sourceUrl: string;
  blocks: readonly QuoteBlock[];
}

export interface FaqEntry {
  id: string;
  question: string;
  quotations: readonly Quotation[];
}

export const ACCESS_DATE = 'October 15, 2026';
export const DISCLAIMER = 'information, not tax advice';

export function blockText(block: QuoteBlock): string {
  if (block.kind === 'paragraph') return block.text;
  if (block.kind === 'items') {
    const parts = [block.intro, ...block.items].filter((part): part is string => Boolean(part && part.length > 0));
    return parts.join(' ');
  }
  return block.rows.map((row) => row.join(' ')).join(' ');
}

export function quotationText(quotation: Quotation): string {
  const body = quotation.blocks.map((block) => blockText(block)).join(' ');
  return `${body} Source: ${quotation.sourceUrl}. Accessed ${ACCESS_DATE}.`;
}

export function visibleAnswer(entry: FaqEntry): string {
  return `${entry.quotations.map((quotation) => quotationText(quotation)).join(' ')} ${DISCLAIMER}`;
}
