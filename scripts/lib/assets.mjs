// Shared by build.mjs and upload-assets.mjs so both agree on CDN file names.
// An image's public name carries a hash of its bytes (hero.3f9a1c2b.webp),
// so the CDN can cache it forever and a changed image always gets a new URL.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, basename, relative } from 'node:path';

export const IMG_DIR = 'src/assets/img';

export function hashedName(file) {
  const h = createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 8);
  const ext = extname(file);
  return `${basename(file, ext)}.${h}${ext}`;
}

export function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Map of "/assets/img/name.webp" -> "img/name.<hash>.webp" (the R2 object key). */
export function imageManifest() {
  const out = {};
  for (const f of walk(IMG_DIR)) {
    const rel = relative(IMG_DIR, f).split('\\').join('/');
    const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/') + 1) : '';
    out[`/assets/img/${rel}`] = `img/${dir}${hashedName(f)}`;
  }
  return out;
}
