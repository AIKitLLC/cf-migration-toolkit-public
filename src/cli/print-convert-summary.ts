import type { ConversionReport } from '../convert/conversion-report.js';

export function printConvertSummary(report: ConversionReport): void {
  const { summary } = report;
  console.error(
    `cfmt convert: ${summary.writtenRedirects} written, ${summary.unsupported} unsupported, ${summary.writtenHeaderRules} header rule(s), source=${summary.source}`,
  );
}
