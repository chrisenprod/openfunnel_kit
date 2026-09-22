import { createServer } from 'node:http';
import { db } from './db.js';

const port = Number(process.env.PORT || 3001);
const health = db.prepare('SELECT 1 AS ok');

const server = createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'GET' && req.url?.split('?')[0] === '/api/health') {
    try {
      res.end(JSON.stringify({ ok: health.get().ok === 1 }));
    } catch (error) {
      console.error(error);
      res.writeHead(503);
      res.end(JSON.stringify({ ok: false }));
    }
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`API: http://127.0.0.1:${port}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
