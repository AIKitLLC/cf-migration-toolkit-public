import type { CheckId } from '../domain/check-id.js';
import type { Finding } from '../domain/finding.js';
import type { Severity } from '../domain/severity.js';

export function groupFindings(findings: readonly Finding[], severity: Severity): Map<CheckId, Finding[]> {
  const groups = new Map<CheckId, Finding[]>();
  for (const finding of findings) {
    if (finding.severity !== severity) continue;
    const rows = groups.get(finding.check);
    if (rows) {
      rows.push(finding);
      continue;
    }
    groups.set(finding.check, [finding]);
  }
  return groups;
}
