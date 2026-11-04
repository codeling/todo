#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// Checks the icon files against the convention of README.md, and that preview.html lists them all:
//   node check.js [directory with the icons, default: icons]
// Exits with 1 and prints every problem. No dependencies. Apps which include this repository as a
// subtree run it in their tests (node icons/check.js icons).
const fs = require('fs');
const path = require('path');
const { previewHtml } = require('./preview.js');

const dir = path.resolve(process.argv[2] || path.join(__dirname, 'icons'));
const problems = [];
const bad = (file, message) => problems.push(`${file}: ${message}`);

/** The problems of one file, as a list of texts (empty: the file follows the convention) */
function check(name, text) {
  const found = [];
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) found.push('the name is lower case words joined by "-"');
  if (!/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 16 16">/.test(text)) {
    found.push('must start with <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">');
  }
  if ((text.match(/<svg[\s>]/g) || []).length !== 1) found.push('exactly one <svg> element');
  if ((text.match(/\bid="/g) || []).length !== 1 || !/<g id="i"[ >]/.test(text)) {
    found.push('the shape must be in one <g id="i"> (the only id in the file)');
  }
  for (const tag of text.match(/<[a-zA-Z][\w-]*/g) || []) {
    if (!['<svg', '<g', '<path', '<circle', '<ellipse', '<rect', '<line', '<polyline', '<polygon'].includes(tag)) {
      found.push(`element ${tag.slice(1)} is not allowed`);
    }
  }
  // colours: only currentColor and none, so that CSS decides (color: ... on the <svg>)
  for (const [, attr, value] of text.matchAll(/\b(fill|stroke|color|stop-color|flood-color)="([^"]*)"/g)) {
    if (value !== 'currentColor' && value !== 'none') found.push(`${attr}="${value}": only currentColor or none`);
  }
  if (/\b(style|class|href|xlink:href|onload|onclick)\s*=/i.test(text) || /\bon\w+\s*=/i.test(text)) {
    found.push('no style, class, href or event attributes (a second tone is opacity)');
  }
  if (/url\(|#[0-9a-fA-F]{3,8}\b(?!")/.test(text.replace(/<g id="i"/, ''))) found.push('no url() or hex colours');
  return found;
}

if (!fs.existsSync(dir)) {
  console.error(`no such directory: ${dir}`);
  process.exit(1);
}
const names = [];
for (const file of fs.readdirSync(dir).sort()) {
  if (!file.endsWith('.svg')) {
    bad(file, 'only .svg files belong here');
    continue;
  }
  const name = file.slice(0, -4);
  names.push(name);
  for (const message of check(name, fs.readFileSync(path.join(dir, file), 'utf8'))) bad(file, message);
}
if (names.length === 0) bad(dir, 'no icons');

// the preview lists all icons (run "node preview.js" after adding one); only for this repository's own folder
const own = path.join(__dirname, 'icons');
if (dir === own) {
  const preview = path.join(__dirname, 'preview.html');
  if (!fs.existsSync(preview) || fs.readFileSync(preview, 'utf8') !== previewHtml(names)) {
    bad('preview.html', 'is out of date: run "node preview.js"');
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`${names.length} icons ok`);
