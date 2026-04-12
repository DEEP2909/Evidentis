import net from 'node:net';

const host = process.argv[2] ?? '127.0.0.1';
const port = Number.parseInt(process.argv[3] ?? '', 10);
const timeoutSeconds = Number.parseInt(process.argv[4] ?? '90', 10);

if (!Number.isInteger(port) || port <= 0) {
  console.error('Usage: node scripts/wait-for-port.mjs <host> <port> [timeoutSeconds]');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const canConnect = () =>
  new Promise((resolve) => {
    const socket = net.createConnection({ host, port });

    const finish = (ok) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };

    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(1000, () => finish(false));
  });

const startedAt = Date.now();
const timeoutAt = startedAt + timeoutSeconds * 1000;

while (Date.now() < timeoutAt) {
  // eslint-disable-next-line no-await-in-loop
  const ready = await canConnect();
  if (ready) {
    process.exit(0);
  }
  // eslint-disable-next-line no-await-in-loop
  await sleep(1000);
}

console.error(`Timed out waiting for ${host}:${port} after ${timeoutSeconds}s`);
process.exit(1);
