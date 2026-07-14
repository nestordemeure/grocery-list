#!/usr/bin/env node
// Build: inline src/style.css and src/app.js into a single index.html at the
// repo root (what GitHub Pages serves), and copy sw.js and manifest.json.
// A single self-contained file means the app paints after one cached request,
// which matters on old phones where every service-worker round trip is slow.
//
// Usage: node build.js

const fs = require('fs');
const path = require('path');

const src = name => path.join(__dirname, 'src', name);
const out = name => path.join(__dirname, name);

let html = fs.readFileSync(src('index.html'), 'utf8');
const css = fs.readFileSync(src('style.css'), 'utf8');
const js = fs.readFileSync(src('app.js'), 'utf8');

const cssTag = '<link rel="stylesheet" href="style.css">';
const jsTag = '<script src="app.js" defer></script>';

if (!html.includes(cssTag) || !html.includes(jsTag)) {
    console.error('build.js: expected tags not found in src/index.html — update cssTag/jsTag');
    process.exit(1);
}

// Replacer functions so `$` sequences in the CSS/JS are not interpreted
html = html.replace(cssTag, () => `<style>\n${css}</style>`);
html = html.replace(jsTag, () => `<script>\n${js}</script>`);

fs.writeFileSync(out('index.html'), html);
fs.copyFileSync(src('sw.js'), out('sw.js'));
fs.copyFileSync(src('manifest.json'), out('manifest.json'));

console.log('Built index.html, sw.js, manifest.json from src/');
