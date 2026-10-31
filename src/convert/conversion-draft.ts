import type { SuggestedAlternative, UnsupportedReason } from './unsupported-reason.js';
import type { StatusOrigin } from './resolve-redirect-status.js';

export interface WrittenRedirect {
  file: string;
  line: number;
  from: string;
  to: string;
  status: number;
  statusOrigin: StatusOrigin;
  output: string;
  dynamic: boolean;
  caveat: string | null;
}

export interface WrittenHeader {
  file: string;
  line: number;
  path: string;
  lines: readonly string[];
}

export interface UnsupportedEntry {
  file: string;
  line: number;
  from: string;
  to: string;
  reasons: UnsupportedReason[];
  alternative: SuggestedAlternative;
  message: string;
}

export interface ConversionDraft {
  redirects: WrittenRedirect[];
  headers: WrittenHeader[];
  unsupported: UnsupportedEntry[];
}
