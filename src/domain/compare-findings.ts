import { checkRank } from './check-id.js';
import type { Finding } from './finding.js';
import { severityRank } from './severity.js';

export function compareFindings(left: Finding, right: Finding): number {
  const bySeverity = severityRank(left.severity) - severityRank(right.severity);
  if (bySeverity !== 0) return bySeverity;
  const byCheck = checkRank(left.check) - checkRank(right.check);
  if (byCheck !== 0) return byCheck;
  if (left.path !== right.path) return left.path < right.path ? -1 : 1;
  if (left.old !== right.old) return left.old < right.old ? -1 : 1;
  if (left.new !== right.new) return left.new < right.new ? -1 : 1;
  return 0;
}
