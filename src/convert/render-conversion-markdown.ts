import type { ConversionReport } from './conversion-report.js';

export function renderConversionMarkdown(report: ConversionReport): string {
  const { summary } = report;
  const lines = [
    `source: ${summary.source}`,
    '',
    '# cfmt convert',
    '',
    '## Summary',
    '',
    '| | |',
    '| --- | ---: |',
    `| Written redirects | ${summary.writtenRedirects} |`,
    `| Unsupported | ${summary.unsupported} |`,
    `| Header rules | ${summary.writtenHeaderRules} |`,
    `| Static redirects | ${summary.staticRedirects} |`,
    `| Dynamic redirects | ${summary.dynamicRedirects} |`,
    '',
  ];
  if (report.error) {
    lines.push('## Limit', '', report.error, '');
  }
  lines.push('## Redirects', '');
  if (report.redirects.length === 0) lines.push('None.', '');
  for (const rule of report.redirects) {
    lines.push(`- \`${rule.output}\`${rule.caveat ? ` — ${rule.caveat}` : ''}`);
  }
  if (report.redirects.length > 0) lines.push('');
  lines.push('## Unsupported', '');
  if (report.unsupported.length === 0) lines.push('None.', '');
  for (const entry of report.unsupported) {
    const where = `${entry.file}:${entry.line}`;
    const subject = entry.from ? `\`${entry.from}\`` : entry.reasons.join(', ');
    lines.push(`- ${subject} (${where}) — ${entry.reasons.join(', ')}. Use ${alternativeLabel(entry.alternative)}. ${entry.message}`);
  }
  if (report.unsupported.length > 0) lines.push('');
  lines.push('## Headers', '');
  if (report.headers.length === 0) lines.push('None.', '');
  for (const header of report.headers) {
    lines.push(`- \`${header.path}\``);
    for (const field of header.lines) lines.push(`  - \`${field.trim()}\``);
  }
  if (report.headers.length > 0) lines.push('');
  return `${lines.join('\n').replace(/\n+$/, '')}\n`;
}

function alternativeLabel(alternative: string): string {
  if (alternative === 'bulk-redirects') return 'Bulk Redirects';
  if (alternative === 'redirect-rules') return 'Redirect Rules';
  return 'a Worker';
}
