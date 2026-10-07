#!/usr/bin/env node
// Local preview of dist/ that behaves like Vercel: clean URLs and the custom 404.
//   node scripts/serve.mjs [port]
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.argv[2] || process.env.PORT || 4321);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json' };

const file = (p) => existsSync(p) && statSync(p).isFile() ? p : null;

createServer((req, res) => {
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch { res.writeHead(400); return res.end('Bad request'); }
  if (path.length > 1 && path.endsWith('.html')) {          // cleanUrls: /x.html -> /x
    res.writeHead(308, { Location: path.slice(0, -5) }); return res.end();
  }
  const base = join(DIST, path);
  const hit = file(base) || file(base + '.html') || file(join(base, 'index.html'));
  const target = hit || file(join(DIST, '404.html'));
  if (!target) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(hit ? 200 : 404, { 'Content-Type': TYPES[extname(target)] || 'application/octet-stream' });
  res.end(readFileSync(target));
}).listen(PORT, () => console.log(`edBuddy Pro preview → http://localhost:${PORT}`));
