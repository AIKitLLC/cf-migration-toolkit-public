import type { Finding } from '../domain/finding.js';
import { MISSING_VALUE } from '../domain/display-values.js';
import type { ResponseView } from '../domain/response-view.js';
import type { Comparator } from './comparator.js';
import { linkCanonicals, normalizedCanonicalSet } from './canonical-values.js';
import type { ComparisonInput } from './comparison-input.js';

export class CanonicalComparator implements Comparator {
  compare(input: ComparisonInput): readonly Finding[] {
    const findings: Finding[] = [];
    const html = this.pair(
      input,
      input.oldHtml.canonicalHref ? [input.oldHtml.canonicalHref] : [],
      input.newHtml.canonicalHref ? [input.newHtml.canonicalHref] : [],
      input.oldSnapshot.final,
      input.newSnapshot.final,
      'html',
    );
    if (html) findings.push(html);
    if (!input.headers.includes('link')) return findings;
    const link = this.pair(
      input,
      linkCanonicals(input.oldSnapshot.final.headers.get('link') ?? null),
      linkCanonicals(input.newSnapshot.final.headers.get('link') ?? null),
      input.oldSnapshot.final,
      input.newSnapshot.final,
      'link',
    );
    if (link) findings.push(link);
    return findings;
  }

  private pair(
    input: ComparisonInput,
    oldValues: readonly string[],
    newValues: readonly string[],
    oldView: ResponseView,
    newView: ResponseView,
    channel: 'html' | 'link',
  ): Finding | null {
    const oldNormalized = normalizedCanonicalSet(oldValues, oldView.url, input.oldOrigin, input.newOrigin);
    const newNormalized = normalizedCanonicalSet(newValues, newView.url, input.newOrigin, input.newOrigin);
    if (oldNormalized === newNormalized) return null;
    return {
      path: input.path,
      check: 'canonical-changed',
      severity: 'error',
      old: `${channel}: ${oldNormalized || MISSING_VALUE}`,
      new: `${channel}: ${newNormalized || MISSING_VALUE}`,
    };
  }
}
