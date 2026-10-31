import { assertLiveOriginsArePublic } from './assert-live-origins-public.js';
import { CONVERT_USAGE, ROOT_USAGE } from './convert-usage.js';
import { executeConvert } from './execute-convert.js';
import { executeVerify } from './execute-verify.js';
import { parseConvertArgs } from './parse-convert-args.js';
import { parseVerifyArgs } from './parse-verify-args.js';
import { USAGE } from './usage.js';

export async function runCli(argv: readonly string[]): Promise<number> {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    process.stdout.write(ROOT_USAGE);
    return 0;
  }
  const [command, ...rest] = argv;
  if (command === 'verify') return runVerify(rest);
  if (command === 'convert') return runConvert(rest);
  process.stderr.write(`Unknown command "${command ?? ''}".\n\n${ROOT_USAGE}`);
  return 2;
}

async function runVerify(argv: readonly string[]): Promise<number> {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(USAGE);
    return 0;
  }
  let args;
  try {
    args = parseVerifyArgs(argv);
    if (args.source === 'live') await assertLiveOriginsArePublic(args.oldOrigin, args.newOrigin);
  } catch (error) {
    process.stderr.write(`${messageOf(error)}\n`);
    return 2;
  }
  try {
    return await executeVerify(args);
  } catch (error) {
    process.stderr.write(`${messageOf(error)}\n`);
    return 1;
  }
}

async function runConvert(argv: readonly string[]): Promise<number> {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(CONVERT_USAGE);
    return 0;
  }
  let args;
  try {
    args = parseConvertArgs(argv);
  } catch (error) {
    process.stderr.write(`${messageOf(error)}\n`);
    return 2;
  }
  try {
    return await executeConvert(args);
  } catch (error) {
    process.stderr.write(`${messageOf(error)}\n`);
    return 1;
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
