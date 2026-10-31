import { isReportSource } from '../domain/report-source.js';
import { DEFAULT_HEADER_ALLOWLIST, parseHeaderAllowlist } from '../headers/default-header-allowlist.js';
import { DEFAULT_CONCURRENCY, DEFAULT_RETRIES, DEFAULT_TIMEOUT_MS } from '../fetcher/limits.js';
import { DEFAULT_USER_AGENT } from '../fetcher/user-agent.js';
import { assertOrigin } from '../normalize/assert-origin.js';
import { parseInteger } from './parse-integer.js';
import { splitFlag } from './split-flag.js';
import type { VerifyCliArgs } from './verify-cli-args.js';

export function parseVerifyArgs(argv: readonly string[]): VerifyCliArgs {
  const urlFiles: string[] = [];
  const sitemaps: string[] = [];
  const redirectFiles: string[] = [];
  let oldOrigin: string | undefined;
  let newOrigin: string | undefined;
  let source: string | undefined;
  let crawl: number | undefined;
  let headers: string[] | undefined;
  let jsonPath: string | undefined;
  let mdPath: string | undefined;
  let concurrency = DEFAULT_CONCURRENCY;
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  let retries = DEFAULT_RETRIES;
  let userAgent = DEFAULT_USER_AGENT;
  let failOnWarn = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === undefined) continue;
    const [flag, inline] = splitFlag(token);
    const value = (): string => {
      if (inline !== undefined) return inline;
      const next = argv[index + 1];
      if (next === undefined || next.startsWith('--')) {
        throw new Error(`Missing value for ${flag}`);
      }
      index += 1;
      return next;
    };
    switch (flag) {
      case '--old':
        oldOrigin = value();
        break;
      case '--new':
        newOrigin = value();
        break;
      case '--source':
        if (source !== undefined) throw new Error('--source was passed more than once');
        source = value();
        break;
      case '--urls':
        urlFiles.push(value());
        break;
      case '--sitemap':
        sitemaps.push(value());
        break;
      case '--redirects':
        redirectFiles.push(value());
        break;
      case '--crawl':
        crawl = parseInteger(value(), '--crawl', 0);
        break;
      case '--headers':
        headers = parseHeaderAllowlist(value());
        break;
      case '--json':
        jsonPath = value();
        break;
      case '--md':
        mdPath = value();
        break;
      case '--concurrency':
        concurrency = parseInteger(value(), '--concurrency', 1);
        break;
      case '--timeout':
        timeoutMs = parseInteger(value(), '--timeout', 1);
        break;
      case '--retries':
        retries = parseInteger(value(), '--retries', 0);
        break;
      case '--user-agent':
        userAgent = value();
        break;
      case '--fail-on': {
        const mode = value();
        if (mode !== 'warn') throw new Error('--fail-on only accepts "warn"');
        failOnWarn = true;
        break;
      }
      case '--fail-on-warn':
        if (inline !== undefined) throw new Error('--fail-on-warn does not take a value');
        failOnWarn = true;
        break;
      default:
        throw new Error(`Unknown option: ${flag}`);
    }
  }

  if (!oldOrigin) throw new Error('Missing required --old <origin>');
  if (!newOrigin) throw new Error('Missing required --new <origin>');
  if (!source) throw new Error('Missing required --source fixture|live');
  if (!isReportSource(source)) throw new Error('--source must be fixture or live');
  if (urlFiles.length + sitemaps.length + redirectFiles.length === 0 && crawl === undefined) {
    throw new Error('Provide at least one of --urls, --sitemap, --redirects, or --crawl');
  }
  if (!userAgent.trim()) throw new Error('--user-agent must not be empty');

  return {
    oldOrigin: assertOrigin(oldOrigin),
    newOrigin: assertOrigin(newOrigin),
    source,
    urlFiles,
    sitemaps,
    redirectFiles,
    crawl,
    headers: headers ?? [...DEFAULT_HEADER_ALLOWLIST],
    jsonPath,
    mdPath,
    concurrency,
    timeoutMs,
    retries,
    userAgent,
    failOnWarn,
  };
}
