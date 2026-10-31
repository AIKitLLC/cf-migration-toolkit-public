import type { CheckId } from '../domain/check-id.js';
import type { Finding } from '../domain/finding.js';
import type { Severity } from '../domain/severity.js';
import type { VerifyReport } from '../domain/verify-report.js';
import { CHECK_BLURBS } from './check-blurbs.js';
import { groupFindings } from './group-findings.js';
import { markdownCell } from './markdown-cell.js';

export function renderMarkdownReport(report: VerifyReport): string {
  const lines = [
    `source: ${report.summary.source}`,
    ...(report.summary.evidence ? [`evidence: ${report.summary.evidence}`] : []),
    '',
    '# cfmt verify',
    '',
    `Old origin: \`${report.summary.oldOrigin}\``,
    '',
    `New origin: \`${report.summary.newOrigin}\``,
    '',
    '## Summary',
    '',
    '| | |',
    '| --- | ---: |',
    `| URLs | ${report.summary.urlCount} |`,
    `| Errors | ${report.summary.counts.error} |`,
    `| Warnings | ${report.summary.counts.warning} |`,
    `| Info | ${report.summary.counts.info} |`,
    '',
    ...renderSeverity(report.findings, 'error', 'Errors'),
    ...renderSeverity(report.findings, 'warning', 'Warnings'),
    ...renderSeverity(report.findings, 'info', 'Info'),
  ];
  return `${lines.join('\n').replace(/\n+$/u, '')}\n`;
}

function renderSeverity(findings: readonly Finding[], severity: Severity, title: string): string[] {
  const lines = [`## ${title}`, ''];
  const groups = groupFindings(findings, severity);
  if (groups.size === 0) {
    lines.push('None.', '');
    return lines;
  }
  for (const [check, rows] of groups) {
    lines.push(...renderCheck(check, rows));
  }
  return lines;
}

function renderCheck(check: CheckId, rows: readonly Finding[]): string[] {
  const lines = [`### ${check}`, ''];
  const blurb = CHECK_BLURBS[check];
  if (blurb) {
    lines.push(blurb, '');
  }
  lines.push('| Path | Old | New |', '| --- | --- | --- |');
  for (const row of rows) {
    lines.push(`| \`${markdownCell(row.path)}\` | ${markdownCell(row.old)} | ${markdownCell(row.new)} |`);
  }
  lines.push('');
  return lines;
}
