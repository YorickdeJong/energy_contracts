#!/usr/bin/env node

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const DEFAULT_PORT = 3000;
const MAX_PORT_ATTEMPTS = 10;

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + MAX_PORT_ATTEMPTS; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found between ${startPort} and ${startPort + MAX_PORT_ATTEMPTS - 1}`);
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

async function startServer() {
  try {
    await app.prepare();

    const requestedPort = parseInt(process.env.PORT, 10) || DEFAULT_PORT;
    const port = await findAvailablePort(requestedPort);

    if (port !== requestedPort) {
      console.log(`⚠️  Port ${requestedPort} is already in use`);
      console.log(`✅ Starting server on port ${port} instead\n`);
    }

    createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }).listen(port, (err) => {
      if (err) throw err;
      console.log(`> Ready on http://localhost:${port}`);

      if (port !== DEFAULT_PORT) {
        console.log(`\n💡 To use this port in your environment, update NEXTAUTH_URL:`);
        console.log(`   NEXTAUTH_URL=http://localhost:${port}`);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
