import { conditionKindForKey, conditionsFromTable } from './condition-kind.js';
import { emptyMigrationProject } from './migration-document.js';
import type { HeaderField, MatchCondition, MigrationHeaderRule, MigrationProject, MigrationRedirect } from './migration-document.js';
import { parseInlineTomlTable } from './parse-inline-toml-table.js';
import { parseTomlScalar } from './parse-toml-scalar.js';
import { readLogicalTomlLines } from './toml-logical-lines.js';

const REDIRECTS_TABLE = /^\[\[\s*redirects\s*\]\]$/i;
const HEADERS_TABLE = /^\[\[\s*headers\s*\]\]$/i;
const REDIRECT_HEADERS = /^\[\s*redirects\.headers\s*\]$/i;
const HEADER_VALUES = /^\[\s*headers\.values\s*\]$/i;
const ANY_TABLE = /^\[\[?[^\]]+\]\]?$/;
const ASSIGNMENT = /^([A-Za-z0-9_.-]+)\s*=\s*(.*)$/;

interface RedirectDraft {
  line: number;
  fields: Record<string, string>;
  conditions: MatchCondition[];
  signed: boolean;
  proxyRequestHeaders: boolean;
}

interface HeaderDraft {
  line: number;
  path: string;
  headers: HeaderField[];
}

export function parseNetlifyConfig(text: string, file: string): MigrationProject {
  const project = emptyMigrationProject();
  let redirect: RedirectDraft | null = null;
  let header: HeaderDraft | null = null;
  let section: 'redirect' | 'redirect-headers' | 'header' | 'header-values' | null = null;

  const flush = (): void => {
    if (redirect) {
      const rule = redirectFromDraft(redirect, file);
      if (rule) project.redirects.push(rule);
    }
    if (header && header.headers.length > 0 && header.path) project.headers.push(headerFromDraft(header, file));
    redirect = null;
    header = null;
    section = null;
  };

  for (const logical of readLogicalTomlLines(text)) {
    if (ANY_TABLE.test(logical.text)) {
      if (REDIRECT_HEADERS.test(logical.text) && redirect) {
        section = 'redirect-headers';
        continue;
      }
      if (HEADER_VALUES.test(logical.text) && header) {
        section = 'header-values';
        continue;
      }
      flush();
      if (REDIRECTS_TABLE.test(logical.text)) {
        redirect = { line: logical.line, fields: {}, conditions: [], signed: false, proxyRequestHeaders: false };
        section = 'redirect';
      } else if (HEADERS_TABLE.test(logical.text)) {
        header = { line: logical.line, path: '', headers: [] };
        section = 'header';
      }
      continue;
    }
    const assignment = ASSIGNMENT.exec(logical.text);
    const key = assignment?.[1];
    const rawValue = assignment?.[2];
    if (!key || rawValue === undefined) continue;
    if (section === 'redirect' && redirect) assignRedirect(redirect, key, rawValue);
    if (section === 'redirect-headers' && redirect) redirect.proxyRequestHeaders = true;
    if (section === 'header' && header && key === 'for') header.path = parseTomlScalar(rawValue);
    if (section === 'header-values' && header) {
      header.headers.push({ name: key, value: parseTomlScalar(rawValue) });
    }
  }
  flush();
  return project;
}

function assignRedirect(redirect: RedirectDraft, key: string, rawValue: string): void {
  if (key === 'query' || key === 'conditions') {
    const table = parseInlineTomlTable(rawValue);
    if (!table) {
      redirect.conditions.push({ kind: key === 'query' ? 'query' : 'has', detail: rawValue });
      return;
    }
    const kindForKey = key === 'query' ? () => 'query' as const : conditionKindForKey;
    redirect.conditions.push(...conditionsFromTable(table, kindForKey));
    return;
  }
  if (key === 'signed') {
    redirect.signed = parseTomlScalar(rawValue).length > 0;
    return;
  }
  redirect.fields[key] = parseTomlScalar(rawValue);
}

function redirectFromDraft(draft: RedirectDraft, file: string): MigrationRedirect | null {
  const from = draft.fields.from ?? '';
  const to = draft.fields.to ?? '';
  if (!from && !to && draft.conditions.length === 0 && !draft.signed && !draft.proxyRequestHeaders) return null;
  const statusText = draft.fields.status;
  const status = statusText !== undefined && statusText !== '' ? Number(statusText) : null;
  const parsedStatus = status !== null && Number.isInteger(status) ? status : statusText !== undefined ? Number.NaN : null;
  return {
    location: { file, line: draft.line },
    platform: 'netlify',
    kind: parsedStatus === 200 ? 'rewrite' : 'redirect',
    from,
    to,
    status: parsedStatus,
    explicitStatus: statusText !== undefined,
    permanent: null,
    force: draft.fields.force === 'true',
    conditions: draft.conditions,
    signed: draft.signed,
    proxyRequestHeaders: draft.proxyRequestHeaders,
  };
}

function headerFromDraft(draft: HeaderDraft, file: string): MigrationHeaderRule {
  return {
    location: { file, line: draft.line },
    platform: 'netlify',
    path: draft.path,
    headers: draft.headers,
    conditions: [],
  };
}
