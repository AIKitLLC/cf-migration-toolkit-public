export const STATIC_REDIRECT_LIMIT = 2_000;
export const DYNAMIC_REDIRECT_LIMIT = 100;
export const REDIRECT_RULE_CHAR_LIMIT = 1_000;
export const HEADER_RULE_LIMIT = 100;
export const HEADER_LINE_CHAR_LIMIT = 2_000;

export const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export class CloudflareLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CloudflareLimitError';
  }
}
