#!/usr/bin/env node
// One-time extractor: split the layered v24 single-file HTML into
//   src/index.html       (skeleton: head + body)
//   src/styles.css       (all <style> blocks concatenated in document order)
//   src/scripts/NN-id.js (each <script> block as its own file, in order)
//   images/*.webp        (the 173 base64 WebP screenshots, byte-for-byte)
//
// Why one file per <script> block (not one big bundle): the v24 page relies on
// classic <script> tags isolating failures. Block "v22-seed-bank-script" has a
// pre-existing syntax error (raw newline in a single-quoted string); in v24 it
// fails alone while every other block still runs. Bundling would make that
// error fatal to the whole page. Keeping one tag per block reproduces v24's
// behavior EXACTLY, error and all. We do not silently fix that bug here.
//
// Data integrity: the problem DATA object is NOT parsed or re-serialized.
// We only do targeted string replacement of each base64 image blob with a
// relative path, leaving every other byte of DATA untouched.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_HTML = path.join(root, '.v24_source.html');
const srcDir = path.join(root, 'src');
const imagesDir = path.join(root, 'images');

fs.mkdirSync(srcDir, { recursive: true });
const scriptsDir = path.join(srcDir, 'scripts');
fs.rmSync(scriptsDir, { recursive: true, force: true });
fs.mkdirSync(scriptsDir, { recursive: true });
// fresh images dir (drop stale v19 PNGs)
fs.rmSync(imagesDir, { recursive: true, force: true });
fs.mkdirSync(imagesDir, { recursive: true });

let html = fs.readFileSync(SRC_HTML, 'utf8');

// Collect style/script blocks in document order.
const blockRe = /<(style|script)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
const styles = [];
const scripts = [];
const idOf = (attrs) => {
  const m = attrs.match(/\bid\s*=\s*"([^"]+)"/i);
  return m ? m[1] : '';
};
let match;
while ((match = blockRe.exec(html)) !== null) {
  const [, tag, attrs, inner] = match;
  const id = idOf(attrs) || (tag === 'style' ? 'core' : 'core');
  (tag.toLowerCase() === 'style' ? styles : scripts).push({ id, inner });
}

// Externalize each base64 WebP blob -> images/img-NNN.webp, replace with path.
// (Only the first block carries DATA + images, but we run it over every block.)
let imgIdx = 0;
const externalizeImages = (code) =>
  code.replace(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/g, (_m, b64) => {
    imgIdx++;
    const name = `img-${String(imgIdx).padStart(3, '0')}.webp`;
    fs.writeFileSync(path.join(imagesDir, name), Buffer.from(b64, 'base64'));
    return `images/${name}`;
  });

// One file per <script> block, preserving order and per-block isolation.
const scriptFiles = scripts.map((b, i) => {
  const num = String(i + 1).padStart(2, '0');
  const slug = (b.id || 'core').replace(/[^a-z0-9-]+/gi, '-');
  const name = `${num}-${slug}.js`;
  fs.writeFileSync(path.join(scriptsDir, name), externalizeImages(b.inner.trim()) + '\n');
  return name;
});

// Build skeleton: drop every style/script block, inject one stylesheet link
// in <head> and the ordered list of <script> tags before </body>.
let skeleton = html.replace(blockRe, '');
skeleton = skeleton.replace(/\n{3,}/g, '\n\n');
skeleton = skeleton.replace(
  /<\/head>/i,
  '<link rel="stylesheet" href="styles.css" />\n</head>'
);
const scriptTags = scriptFiles.map((n) => `<script src="scripts/${n}"></script>`).join('\n');
skeleton = skeleton.replace(/<\/body>/i, `${scriptTags}\n</body>`);

// CSS: safe to concatenate (the CSS parser isolates bad rules on its own).
const css = styles
  .map((b) => `/* ===== ${b.id} ===== */\n${b.inner.trim()}\n`)
  .join('\n');

fs.writeFileSync(path.join(srcDir, 'index.html'), skeleton);
fs.writeFileSync(path.join(srcDir, 'styles.css'), css);

console.log(JSON.stringify({
  styleBlocks: styles.length,
  scriptBlocks: scripts.length,
  scriptFiles,
  images: imgIdx,
  skeletonBytes: Buffer.byteLength(skeleton),
  cssBytes: Buffer.byteLength(css),
}, null, 2));
