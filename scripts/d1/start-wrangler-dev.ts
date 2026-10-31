import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { REPO_ROOT } from './paths.js';

const require = createRequire(import.meta.url);

export interface WranglerDev {
  port: number;
  stop(): Promise<void>;
}

export async function startWranglerDev(options: {
  cwd: string;
  configPath: string;
  port: number;
  inspectorPort: number;
}): Promise<WranglerDev> {
  const bin = wranglerBin();
  const child = spawn(
    process.execPath,
    [
      bin,
      'dev',
      '--config',
      options.configPath,
      '--local',
      '--ip',
      '127.0.0.1',
      '--port',
      String(options.port),
      '--inspector-port',
      String(options.inspectorPort),
      '--show-interactive-dev-session=false',
    ],
    {
      cwd: options.cwd,
      env: localEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    },
  );
  let logs = '';
  const append = (chunk: Buffer): void => {
    logs = `${logs}${chunk.toString()}`.slice(-12_000);
  };
  child.stdout?.on('data', append);
  child.stderr?.on('data', append);
  try {
    await waitForReady(child, options.port, () => logs);
  } catch (error) {
    await stopProcess(child);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}\n${logs}`, { cause: error });
  }
  return {
    port: options.port,
    stop: () => stopProcess(child),
  };
}

function wranglerBin(): string {
  const packageJson = require.resolve('wrangler/package.json', { paths: [REPO_ROOT] });
  return join(dirname(packageJson), 'bin', 'wrangler.js');
}

function localEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' };
  for (const key of Object.keys(env)) {
    if (key.startsWith('CLOUDFLARE_') || key === 'CF_API_TOKEN') delete env[key];
  }
  return env;
}

async function waitForReady(child: ChildProcess, port: number, logs: () => string): Promise<void> {
  const deadline = Date.now() + 90_000;
  let exited: number | null = null;
  child.once('exit', (status) => {
    exited = status;
  });
  while (Date.now() < deadline) {
    if (exited !== null) throw new Error(`wrangler dev exited ${exited}`);
    if (await portAccepts(port)) return;
    await delay(200);
  }
  throw new Error(`wrangler dev did not listen on ${port}. ${logs()}`);
}

function portAccepts(port: number): Promise<boolean> {
  return fetch(`http://127.0.0.1:${port}/`, {
    redirect: 'manual',
    headers: { 'accept-encoding': 'identity' },
  }).then(
    (response) => {
      void response.body?.cancel();
      return true;
    },
    () => false,
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function stopProcess(child: ChildProcess): Promise<void> {
  const pid = child.pid;
  if (pid === undefined || child.exitCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      try {
        process.kill(-pid, 'SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
      resolve();
    }, 5_000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    try {
      process.kill(-pid, 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
  });
}
