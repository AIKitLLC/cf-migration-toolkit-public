import type { CheckId } from './check-id.js';
import type { Severity } from './severity.js';

export interface Finding {
  path: string;
  check: CheckId;
  severity: Severity;
  old: string;
  new: string;
}
