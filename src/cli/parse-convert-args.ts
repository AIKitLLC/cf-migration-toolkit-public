import { isReportSource } from '../domain/report-source.js';
import type { ConvertCliArgs } from './convert-cli-args.js';
import { splitFlag } from './split-flag.js';

export function parseConvertArgs(argv: readonly string[]): ConvertCliArgs {
  const inputs: string[] = [];
  let outDir: string | undefined;
  let source: string | undefined;
  let jsonPath: string | undefined;
  let mdPath: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === undefined) continue;
    const [flag, inline] = splitFlag(token);
    const value = (): string => {
      if (inline !== undefined) return inline;
      const next = argv[index + 1];
      if (next === undefined || next.startsWith('--')) throw new Error(`Missing value for ${flag}`);
      index += 1;
      return next;
    };
    switch (flag) {
      case '--input':
        inputs.push(value());
        break;
      case '--out':
        outDir = value();
        break;
      case '--source':
        source = value();
        break;
      case '--json':
        jsonPath = value();
        break;
      case '--md':
        mdPath = value();
        break;
      default:
        throw new Error(`Unknown option: ${flag}`);
    }
  }

  if (inputs.length === 0) throw new Error('Missing required --input <file>');
  if (!outDir) throw new Error('Missing required --out <dir>');
  if (!source) throw new Error('Missing required --source fixture|live');
  if (!isReportSource(source)) throw new Error('--source must be fixture or live');
  return { inputs, outDir, source, jsonPath, mdPath };
}
