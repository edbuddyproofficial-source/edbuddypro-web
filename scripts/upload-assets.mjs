#!/usr/bin/env node
/**
 * Upload images in src/assets/img to Cloudflare R2.
 *
 *   node scripts/upload-assets.mjs            upload images not yet on R2
 *   node scripts/upload-assets.mjs --all      re-upload everything
 *   node scripts/upload-assets.mjs --pending  just print how many are new
 *
 * Each file goes up under the same hashed name the build writes into the
 * HTML (img/hero.3f9a1c2b.webp) with a one-year immutable cache header.
 * A changed image gets a new name, so the CDN never serves a stale copy.
 * Uploaded names are recorded in scripts/r2-uploaded.txt (committed), so
 * each image is only ever uploaded once.
 *
 * Auth: the edbuddy Cloudflare browser login (setup.sh / deploy.sh handle it),
 * kept in ~/.edbuddy-cli so it never touches another project's login.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { imageManifest } from './lib/assets.mjs';

process.chdir(join(dirname(fileURLToPath(import.meta.url)), '..'));
const BUCKET = process.env.R2_BUCKET || 'edbuddypro-assets';
const LOG = 'scripts/r2-uploaded.txt';
const TYPES = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.avif': 'image/avif' };

const all = process.argv.includes('--all');
const done = new Set(existsSync(LOG) ? readFileSync(LOG, 'utf8').split('\n').filter(Boolean) : []);
const todo = Object.entries(imageManifest()).filter(([, key]) => all || !done.has(key));

if (process.argv.includes('--pending')) { console.log(todo.length); process.exit(0); }
if (!todo.length) { console.log('  ✓ all images already on R2'); process.exit(0); }

console.log(`  Uploading ${todo.length} image(s) to r2://${BUCKET}`);
let failed = 0;
for (const [local, key] of todo) {
  const file = join('src', local.replace(/^\//, ''));
  const r = spawnSync('npx', ['--yes', 'wrangler@4', 'r2', 'object', 'put', `${BUCKET}/${key}`,
    '--file', file,
    '--content-type', TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    '--cache-control', 'public, max-age=31536000, immutable',
    '--remote'], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8',
    env: { ...process.env, XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME || join(homedir(), '.edbuddy-cli') } });
  if (r.status === 0) {
    done.add(key);
    writeFileSync(LOG, [...done].sort().join('\n') + '\n');
    console.log(`  ✓ ${key}`);
  } else {
    failed++;
    console.error(`  ✗ ${key}\n${(r.stderr || r.stdout).trim().split('\n').slice(-4).join('\n')}`);
  }
}
if (failed) { console.error(`\n  ${failed} upload(s) failed. Nothing was deployed.`); process.exit(1); }
