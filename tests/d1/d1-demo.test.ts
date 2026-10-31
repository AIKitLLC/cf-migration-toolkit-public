import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { parse, type HTMLElement, NodeType } from 'node-html-parser';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { measureSimulatedLocalRollback } from '../../scripts/d1/measure-rollback.js';
import { D1_CONVERSION, D1_DIST, D1_PARITY, D1_ROLLBACK, REPO_ROOT } from '../../scripts/d1/paths.js';
import { prepareD1Assets } from '../../scripts/d1/prepare-assets.js';
import { verifyD1Parity } from '../../scripts/d1/verify-parity.js';

const execFileAsync = promisify(execFile);

const OFFICIAL_DEFINITIONS: Readonly<Record<string, string>> = {
  FAQ: 'https://www.irs.gov/faqs',
  EIN: 'https://www.irs.gov/businesses/small-businesses-self-employed/employer-id-numbers',
  ID: 'https://www.irs.gov/tin/taxpayer-identification-numbers-tin',
  IRS: 'https://www.irs.gov/about-irs',
  LLC: 'https://www.irs.gov/businesses/small-businesses-self-employed/limited-liability-company-llc',
  SSN: 'https://www.irs.gov/tin/taxpayer-identification-numbers-tin',
  ITIN: 'https://www.irs.gov/individuals/individual-taxpayer-identification-number',
  TIN: 'https://www.irs.gov/tin/taxpayer-identification-numbers-tin',
};

const IGNORED_TOKENS = new Set(['DEMO']);
const ACRONYM = /(?<![A-Za-z0-9-])[A-Z]{2,}(?![A-Za-z0-9-])/g;

const COMMITTED = [
  join(D1_CONVERSION, 'report.json'),
  join(D1_CONVERSION, 'report.md'),
  join(D1_CONVERSION, '_redirects'),
  join(D1_CONVERSION, '_headers'),
  join(D1_CONVERSION, 'form-unsupported.json'),
  join(D1_PARITY, 'report.json'),
  join(D1_PARITY, 'report.md'),
  join(D1_PARITY, 'content-hash.json'),
  join(D1_ROLLBACK, 'simulated-local.json'),
  join(D1_ROLLBACK, 'simulated-local.md'),
];

describe('D1 Netlify static FAQ demo', () => {
  const committed = new Map<string, Buffer>();

  beforeAll(async () => {
    for (const file of COMMITTED) committed.set(file, await readFile(file));
  });

  afterAll(async () => {
    for (const file of COMMITTED) {
      expect(await readFile(file)).toEqual(committed.get(file));
    }
  });

  it('builds the site and matches FAQPage JSON-LD to the visible text', async () => {
    await prepareD1Assets();
    const html = await readFile(join(D1_DIST, 'faq.html'), 'utf8');
    const root = parse(html);
    const rawJson = root.querySelector('script[type="application/ld+json"]')?.text;
    expect(rawJson).toBeTruthy();
    const document = JSON.parse(rawJson ?? '') as {
      '@type': string;
      mainEntity: { name: string; acceptedAnswer: { text: string } }[];
    };
    expect(document['@type']).toBe('FAQPage');
    const articles = root.querySelectorAll('[data-faq-question]');
    expect(articles).toHaveLength(10);
    expect(document.mainEntity).toHaveLength(10);
    articles.forEach((article, index) => {
      const question = collapse(article.querySelector('[data-faq-q]')?.text ?? '');
      const answer = collapse(article.querySelector('[data-faq-a]')?.text ?? '');
      const entity = document.mainEntity[index];
      expect(entity?.name).toBe(question);
      expect(collapse(entity?.acceptedAnswer.text ?? '')).toBe(answer);
      expect(answer).toContain('information, not tax advice');
      expect(answer).toContain('Accessed October 15, 2026.');
      expect(answer).toContain('https://www.irs.gov/');
    });
    const visible = collapse(root.querySelector('body')?.text ?? '');
    expect(visible.toLowerCase()).not.toContain('lottery');
    expect(visible.toLowerCase()).not.toContain('gambling');
    expect(visible).toContain('DEMO: fictional product / sample site, not a real company');
  }, 180_000);

  it('links the first use of every acronym to an official definition', async () => {
    await prepareD1Assets();
    for (const file of ['index.html', 'faq.html', 'form-stub.html']) {
      const html = await readFile(join(D1_DIST, file), 'utf8');
      const uses = firstAcronymUses(html);
      for (const [token, href] of uses) {
        if (IGNORED_TOKENS.has(token)) continue;
        expect(OFFICIAL_DEFINITIONS[token], `${file} uses ${token}`).toBeTruthy();
        expect(href, `${file} first ${token}`).toBe(OFFICIAL_DEFINITIONS[token]);
      }
    }
  }, 180_000);

  it('writes an explicit 301 for the status-less Netlify rule and reports the form', async () => {
    await prepareD1Assets();
    const redirects = await readFile(join(D1_DIST, '_redirects'), 'utf8');
    const lines = redirects
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));
    expect(lines).toContain('/estimated-tax-dates /faq 301');
    expect(lines).toContain('/ein /faq 301');
    expect(lines).toContain('/apply-for-ein /faq 302');
    expect(lines).toContain('/llc-ein /faq 200');
    expect(lines).toContain('/library/* /faq 301');
    for (const line of lines) expect(line).toMatch(/ (200|301|302|303|307|308)$/);
    const headers = await readFile(join(D1_DIST, '_headers'), 'utf8');
    expect(headers).toContain('X-Robots-Tag: noindex');
    const conversion = await readFile(join(D1_DIST, 'conversion-report.json'), 'utf8');
    expect(conversion).toContain('"file": "examples/d1-netlify-static-faq/site/netlify.toml"');
    expect(conversion).not.toContain('/workspace/');
    const form = JSON.parse(await readFile(join(D1_DIST, 'form-unsupported.json'), 'utf8')) as {
      source: string;
      handler: string;
      forms: { name: string; storesSubmission: boolean }[];
    };
    expect(form.source).toBe('fixture');
    expect(form.handler).toBe('unsupported');
    expect(form.forms.map((entry) => entry.name)).toEqual(['sample-question']);
    expect(form.forms[0]?.storesSubmission).toBe(false);
  }, 180_000);

  it('runs fixture parity against wrangler dev --local with no evidence level', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'd1-parity-'));
    try {
      const code = await verifyD1Parity(dir);
      expect(code).toBe(0);
      const report = JSON.parse(await readFile(join(dir, 'report.json'), 'utf8')) as {
        summary: { source: string; evidence?: string; counts: { error: number; warning: number } };
      };
      const markdown = await readFile(join(dir, 'report.md'), 'utf8');
    expect(report.summary.source).toBe('fixture');
    expect(report.summary.evidence).toBeUndefined();
    expect(report.summary.counts.error).toBe(0);
    expect(report.summary.counts.warning).toBe(0);
      expect(markdown.startsWith('source: fixture\n')).toBe(true);
      expect(markdown.split('\n')[1]).not.toMatch(/^evidence:/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 180_000);

  it('records a simulated-local rollback and leaves the workers.dev timing unmeasured', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'd1-rollback-'));
    try {
      const measured = await measureSimulatedLocalRollback(dir);
      expect(measured.label).toBe('simulated-local');
      expect(measured.elapsedMs).toBeGreaterThan(0);
      expect(measured.workersDev).toEqual({
        status: 'not-measured',
        after: 'maintainer approval',
        procedure: 'examples/d1-netlify-static-faq/GO-LIVE.md',
      });
      const saved = JSON.parse(await readFile(join(dir, 'simulated-local.json'), 'utf8')) as {
        label: string;
      };
      expect(saved.label).toBe('simulated-local');
      const markdown = await readFile(join(dir, 'simulated-local.md'), 'utf8');
      expect(markdown.startsWith('label: simulated-local\n')).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 180_000);

  it('checks the rollback timing script without calling Wrangler', async () => {
    const script = await readFile(join(REPO_ROOT, 'scripts/d1/measure-rto.sh'), 'utf8');
    expect(script).toContain('date +%s%N');
    expect(script).toContain('__version.txt');
    expect(script).toContain('wrangler rollback "$V1_ID" --yes --message "$MERGED_SHA"');
    expect(script).toContain('tail --format json');
    expect(script).toContain('node_modules/.bin/wrangler');
    expect(script).toContain('setsid');
    expect(script).toContain('trap on_signal INT TERM HUP');
    expect(script).toContain('/__cfmt-invoke');
    expect(script).not.toContain('perf_counter');
    expect(script).not.toContain('IGNORECASE');
    expect(script).not.toContain('waiting for logs');
    const flow = script.slice(script.indexOf('write_marker v1'));
    const smoke = flow.indexOf('${WORKERS_DEV_ORIGIN}${INVOKE_PATH}');
    const stopped = flow.indexOf('stop_tail', smoke);
    expect(flow.indexOf('start_tail')).toBeGreaterThan(-1);
    expect(flow.indexOf('start_tail')).toBeLessThan(flow.indexOf('wait_for_tail_nonce'));
    expect(flow.indexOf('wait_for_tail_nonce')).toBeLessThan(flow.indexOf('${WORKERS_DEV_ORIGIN}/'));
    expect(smoke).toBeGreaterThan(flow.indexOf('${WORKERS_DEV_ORIGIN}/'));
    expect(stopped).toBeGreaterThan(smoke);
    expect(stopped).toBeLessThan(flow.indexOf('sample_rollback'));
    const { stdout } = await execFileAsync('bash', [join(REPO_ROOT, 'scripts/d1/measure-rto.sh'), '--check']);
    expect(stdout).toContain('measure-rto --check ok');
    const env = { ...process.env };
    delete env.MERGED_SHA;
    await expect(execFileAsync('bash', [join(REPO_ROOT, 'scripts/d1/measure-rto.sh')], { env })).rejects.toThrow(/MERGED_SHA/);
  });

  it('keeps a relative path in the committed conversion report', async () => {
    const report = await readFile(join(D1_CONVERSION, 'report.json'), 'utf8');
    expect(report).toContain('"file": "examples/d1-netlify-static-faq/site/netlify.toml"');
    expect(report).not.toContain('/workspace/');
  });
});

function collapse(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function firstAcronymUses(html: string): Map<string, string | null> {
  const body = parse(html).querySelector('body');
  if (!body) throw new Error('page is missing a body');
  const found = new Map<string, string | null>();
  walk(body, found);
  return found;
}

function walk(node: HTMLElement, found: Map<string, string | null>): void {
  const tag = node.rawTagName?.toLowerCase();
  if (tag === 'script' || tag === 'style') return;
  for (const child of node.childNodes) {
    if (child.nodeType === NodeType.TEXT_NODE) {
      const text = child.rawText ?? '';
      for (const match of text.matchAll(ACRONYM)) {
        const token = match[0];
        if (!token || found.has(token)) continue;
        found.set(token, anchorHref(child.parentNode as HTMLElement | null));
      }
      continue;
    }
    if (child.nodeType === NodeType.ELEMENT_NODE) walk(child as HTMLElement, found);
  }
}

function anchorHref(node: HTMLElement | null): string | null {
  let current = node;
  while (current) {
    if (current.rawTagName?.toLowerCase() === 'a') return current.getAttribute('href') ?? null;
    current = current.parentNode as HTMLElement | null;
  }
  return null;
}
