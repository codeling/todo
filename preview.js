#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// Writes preview.html: all icons, in the light and the dark scheme and in two sizes. Open it through a
// web server (browsers do not load the files of <use> from file:// URLs), e.g. "python3 -m http.server"
// in this directory, then http://localhost:8000/preview.html.
const fs = require('fs');
const path = require('path');

/** The page for these icon names */
function previewHtml(names) {
  const cell = (name) => `<figure><svg class="icon" viewBox="0 0 16 16"><use href="icons/${name}.svg#i"/></svg>` +
    `<figcaption>${name}</figcaption></figure>`;
  const section = (title, cls) => `<section class="${cls}"><h2>${title}</h2><div>${names.map(cell).join('')}</div></section>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Icons</title>
<link rel="stylesheet" href="preview.css">
</head>
<body>
${section('Light', 'light')}
${section('Dark', 'dark')}
${section('Small (24px)', 'light small')}
${section('Small (24px)', 'dark small')}
</body>
</html>
`;
}

module.exports = { previewHtml };

if (require.main === module) {
  const names = fs.readdirSync(path.join(__dirname, 'icons')).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)).sort();
  fs.writeFileSync(path.join(__dirname, 'preview.html'), previewHtml(names));
}
