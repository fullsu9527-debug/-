#!/usr/bin/env node
// Build the deployable from src/. Inlines styles.css + app.js into a single
// index.html; the 173 WebP screenshots stay external in images/ (referenced as
// images/img-NNN.webp). Output: a Pages-ready folder = index.html + images/.
//
// Usage:
//   node build.mjs            -> writes ./index.html (serve repo root)
//   node build.mjs <outDir>   -> writes <outDir>/index.html and copies images/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(root, 'src');
const outDir = process.argv[2] ? path.resolve(root, process.argv[2]) : root;

const html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(srcDir, 'styles.css'), 'utf8');

// Guard: inlining would break if the CSS contained a closing tag.
if (/<\/style>/i.test(css)) throw new Error('styles.css contains </style>');

let out = html.replace(
  /<link rel="stylesheet" href="styles\.css" \/>/,
  `<style>\n${css}\n</style>`
);

// Inline each script as its OWN <script> tag, preserving block order and the
// per-block failure isolation the page depends on (see tools/extract.mjs).
out = out.replace(/<script src="scripts\/([^"]+)"><\/script>/g, (_m, name) => {
  const js = fs.readFileSync(path.join(srcDir, 'scripts', name), 'utf8');
  if (/<\/script>/i.test(js)) throw new Error(`${name} contains </script>`);
  return `<script>\n${js}\n</script>`;
});

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), out);
// Keep Pages from running Jekyll (which would ignore files; harmless either way).
fs.writeFileSync(path.join(outDir, '.nojekyll'), '');

// When building into a separate folder, copy images alongside.
if (path.resolve(outDir) !== path.resolve(root)) {
  const dst = path.join(outDir, 'images');
  fs.rmSync(dst, { recursive: true, force: true });
  fs.cpSync(path.join(root, 'images'), dst, { recursive: true });
}

console.log(`Built ${path.relative(root, path.join(outDir, 'index.html')) || 'index.html'} (${Buffer.byteLength(out)} bytes)`);
