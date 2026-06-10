import { createServer } from 'http';
import { createReadStream, statSync } from 'fs';
import { join, extname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, 'dist');
const PORT = parseInt(process.env.PORT || '5175');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
};

createServer((req, res) => {
  let pathname = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let filePath = join(DIST, pathname);

  const tryFile = (p) => {
    try { const s = statSync(p); return s.isFile() ? p : null; } catch { return null; }
  };

  let resolved = tryFile(filePath) || tryFile(join(DIST, 'index.html'));
  if (!resolved) { res.writeHead(404); res.end('Not found'); return; }

  const ext = extname(resolved);
  const type = MIME[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  createReadStream(resolved).pipe(res);
}).listen(PORT, '0.0.0.0', () => {
  console.log(`[neural-hq] serving dist/ on :${PORT}`);
});
