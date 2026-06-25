// =============================================================================
//  SERVIDOR DEL DEMO  — estático, sin dependencias (http nativo de Node)
// -----------------------------------------------------------------------------
//  Sirve la carpeta del proyecto para poder abrir index.html con módulos ES y
//  fetch de los .game.json (que file:// bloquea). Uso: npm run demo
//      node scripts/serve.js --port=8090
// =============================================================================

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, normalize, extname, dirname } from 'node:path';

const ROOT = normalize(join(dirname(fileURLToPath(import.meta.url)), '..'));
const argPort = process.argv.find((a) => a.startsWith('--port='));
const PORT = Number(argPort ? argPort.split('=')[1] : process.env.PORT || 8090);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent((req.url || '/').split('?')[0]);
    if (path === '/') path = '/index.html';
    // Evita salir de la carpeta del proyecto (path traversal).
    const filePath = normalize(join(ROOT, path));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end('Prohibido');
      return;
    }
    const info = await stat(filePath);
    if (info.isDirectory()) { res.writeHead(301, { Location: path + '/index.html' }).end(); return; }
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': TYPES[extname(filePath)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado');
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('  🎮  motor-edu-mesh — demo');
  console.log(`  ▶  http://localhost:${PORT}`);
  console.log('     (Ctrl+C para detener)');
  console.log('');
});
