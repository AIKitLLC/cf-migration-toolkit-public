import { describe, expect, it } from 'vitest';
import { buildReport } from '../../src/domain/build-report.js';
import type { Finding } from '../../src/domain/finding.js';
import { exitStatusForReport } from '../../src/reporters/exit-status.js';
import { renderJsonReport } from '../../src/reporters/render-json-report.js';
import { renderMarkdownReport } from '../../src/reporters/render-markdown-report.js';

const findings: Finding[] = [
  {
    path: '/other',
    check: 'canonical-changed',
    severity: 'error',
    old: 'html: https://new.example/a',
    new: 'html: https://new.example/b',
  },
  {
    path: '/old-blog/sample',
    check: 'redirect-status-changed',
    severity: 'error',
    old: '301',
    new: '302',
  },
  {
    path: '/old-blog/sample',
    check: 'status-changed',
    severity: 'warning',
    old: '301',
    new: '302',
  },
];

function report() {
  return buildReport({
    source: 'fixture',
    oldOrigin: 'http://127.0.0.1:41731',
    newOrigin: 'http://127.0.0.1:41732',
    urlCount: 2,
    findings,
  });
}

describe('reports', () => {
  it('puts source on the JSON summary and lists redirect-status-changed first', () => {
    const body = JSON.parse(renderJsonReport(report())) as {
      summary: { source: string; counts: { error: number; warning: number; info: number } };
      findings: Finding[];
    };
    expect(body.summary.source).toBe('fixture');
    expect(Object.hasOwn(body.summary, 'evidence')).toBe(false);
    expect(body.summary.counts).toEqual({ error: 2, warning: 1, info: 0 });
    expect(body.findings[0]).toMatchObject({ check: 'redirect-status-changed', severity: 'error' });
    expect(body.findings.map((finding) => finding.severity)).toEqual(['error', 'error', 'warning']);
  });

  it('starts Markdown with the source line and lists errors before warnings', () => {
    const markdown = renderMarkdownReport(report());
    expect(markdown.startsWith('source: fixture\n')).toBe(true);
    expect(markdown.includes('evidence:')).toBe(false);
    expect(markdown.includes('E2')).toBe(false);
    const redirectAt = markdown.indexOf('### redirect-status-changed');
    const canonicalAt = markdown.indexOf('### canonical-changed');
    const statusAt = markdown.indexOf('### status-changed');
    const warningsAt = markdown.indexOf('## Warnings');
    expect(redirectAt).toBeGreaterThan(-1);
    expect(redirectAt).toBeLessThan(canonicalAt);
    expect(canonicalAt).toBeLessThan(warningsAt);
    expect(warningsAt).toBeLessThan(statusAt);
  });

  it('exits 1 for errors, and for warnings only when fail-on warn is set', () => {
    const withErrors = report();
    expect(exitStatusForReport(withErrors, false)).toBe(1);
    const warnings = buildReport({
      source: 'live',
      oldOrigin: 'https://old.example',
      newOrigin: 'https://new.example',
      urlCount: 1,
      findings: [findings[2]!],
    });
    expect(exitStatusForReport(warnings, false)).toBe(0);
    expect(exitStatusForReport(warnings, true)).toBe(1);
    const infoOnly = buildReport({
      source: 'fixture',
      oldOrigin: 'https://old.example',
      newOrigin: 'https://new.example',
      urlCount: 1,
      findings: [
        {
          path: '/ein',
          check: 'header-added',
          severity: 'info',
          old: 'x-robots-tag: (missing)',
          new: 'x-robots-tag: noindex',
        },
      ],
    });
    expect(infoOnly.summary.counts).toEqual({ error: 0, warning: 0, info: 1 });
    expect(exitStatusForReport(infoOnly, true)).toBe(0);
    expect(renderMarkdownReport(infoOnly)).toContain('### header-added');
    expect(renderMarkdownReport(infoOnly).indexOf('## Warnings')).toBeLessThan(
      renderMarkdownReport(infoOnly).indexOf('## Info'),
    );
  });

  it('labels a live report E2 and rejects a source that is not fixture or live', () => {
    const live = buildReport({
      source: 'live',
      oldOrigin: 'https://old.example',
      newOrigin: 'https://new.example',
      urlCount: 1,
      findings: [],
    });
    expect(live.summary.evidence).toBe('E2');
    const json = JSON.parse(renderJsonReport(live)) as { summary: { source: string; evidence?: string } };
    expect(json.summary).toMatchObject({ source: 'live', evidence: 'E2' });
    expect(renderMarkdownReport(live).startsWith('source: live\nevidence: E2\n')).toBe(true);
    expect(() =>
      buildReport({
        source: 'E2' as 'live',
        oldOrigin: 'https://old.example',
        newOrigin: 'https://new.example',
        urlCount: 0,
        findings: [],
      }),
    ).toThrow('source must be fixture or live');
  });
});
