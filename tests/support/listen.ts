import http from 'node:http';
import type { AddressInfo, Socket } from 'node:net';

export interface LocalServer {
  origin: string;
  close(): Promise<void>;
}

export async function listen(handler: http.RequestListener): Promise<LocalServer> {
  const sockets = new Set<Socket>();
  const server = http.createServer(handler);
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address() as AddressInfo | null;
  if (!address) throw new Error('Test server did not bind a port');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        for (const socket of sockets) socket.destroy();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
