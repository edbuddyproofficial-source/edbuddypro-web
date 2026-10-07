#!/usr/bin/env node
/**
 * Upload every image in src/assets/img to Cloudflare R2.
 *
 *   node scripts/upload-assets.mjs            (bucket from R2_BUCKET, default edbuddypro-assets)
 *
 * Each file goes up under the same hashed name the build writes into the
 * HTML (img/hero.3f9a1c2b.webp), with a one-year immutable cache header, so
 * Cloudflare can cache it at the edge forever. Re-running is safe: unchanged
 * images keep their name, changed images get a new one.
 *
 * Needs: `npx wrangler login` once on this machine.
 */
import { spawnSync } from 'node:child_process';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageManifest } from './lib/assets.mjs';

process.chdir(join(dirname(fileURLToPath(import.meta.url)), '..'));
const BUCKET = process.env.R2_BUCKET || 'edbuddypro-assets';
const TYPES = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.avif': 'image/avif' };

const manifest = imageManifest();
const entries = Object.entries(manifest);
console.log(`Uploading ${entries.length} images to r2://${BUCKET}\n`);

let failed = 0;
for (const [local, key] of entries) {
  const file = join('src', local.replace(/^\//, ''));
  const r = spawnSync('npx', ['--yes', 'wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`,
    '--file', file,
    '--content-type', TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    '--cache-control', 'public, max-age=31536000, immutable',
    '--remote'], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  if (r.status === 0) console.log(`  ✓ ${key}`);
  else { failed++; console.error(`  ✗ ${key}\n${(r.stderr || r.stdout).trim()}`); }
}
if (failed) { console.error(`\n${failed} upload(s) failed.`); process.exit(1); }
console.log(`\nDone. Images are served from https://cdn.edbuddypro.com/img/…`);
