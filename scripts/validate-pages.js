#!/usr/bin/env node
/* TWERKHUB Pre-deploy page validator */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SKIP_FILES = new Set([
  // Legacy known-bad (pre-existing cyrillic encoding mess — see scripts/CONTRIBUTING-ENCODING.md):
  'playlist/turbo-pushka.html',
  'playlist/twerk--.html',
  // Legacy double-encoded cyrillic in body content (half-decoded mix):
  'group-emiliano-ferrari-villalobo.html',
  'group-monika-99-percent.html',
  'group-street-project-monika.html',
  // Legacy triple-encoded cyrillic in data-video-slug attributes (cp866 + cp1251 + cp1252):
  'playlist/-twerk--10age.html',
  'playlist/-twerk-2.html',
  'playlist/-twerk-3.html',
  'playlist/-twerk-4.html',
  'playlist/-twerk.html',
  'playlist/aneli-team.html',
  'playlist/interaktivnoe-buti.html',
  'playlist/liuba-twerk.html',
  'playlist/sonia-twerk.html'
]);
const CRITICAL_REQUIRED_ASSETS = {
  'index.html': ['twerkhub-countdowns.js', 'twerkhub-watchdog.js'],
  'membership.html': ['twerkhub-watchdog.js']
};

const errors = [];
const warnings = [];

const MOJIBAKE_MARKERS = ['ðŸ', 'â€', 'â†', 'â—', 'â˜', 'âœ', 'âš', 'Â·', 'Ã©', 'Ã¡', 'Ã­', 'Ã³', 'Ãº', 'Ã±', 'Ã‰', 'Ð'];

function checkEncoding(content, rel) {
  if (content.charCodeAt(0) === 0xFEFF) {
    errors.push(rel + ': starts with UTF-8 BOM');
    return;
  }
  for (const marker of MOJIBAKE_MARKERS) {
    if (content.indexOf(marker) !== -1) {
      const idx = content.indexOf(marker);
      const ctx = content.slice(Math.max(0, idx - 20), idx + 20).replace(/\n/g, '\\n');
      errors.push(rel + ': mojibake marker found near ' + ctx);
      return;
    }
  }
}

function listHtmlFiles(dir, out){
  out = out || [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listHtmlFiles(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function check(file){
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (SKIP_FILES.has(rel) || SKIP_FILES.has(path.basename(file))) return;
  let content;
  try { content = fs.readFileSync(file, 'utf8'); }
  catch(e){ errors.push(rel + ': cannot read (' + e.message + ')'); return; }

  checkEncoding(content, rel);

  const tail = content.slice(-200).replace(/\s+$/, '');
  if (!/<\/body>\s*<\/html>\s*$/i.test(tail) && !/<\/html>\s*$/i.test(tail)) {
    errors.push(rel + ': file does not end with </body></html>');
  }

  const openCount = (content.match(/<script\b[^>]*>/gi) || []).length;
  const closeCount = (content.match(/<\/script>/gi) || []).length;
  if (openCount !== closeCount) {
    errors.push(rel + ': <script> open=' + openCount + ' close=' + closeCount);
  }

  const inlineScripts = [...content.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  inlineScripts.forEach((m, idx) => {
    const code = m[1].trim();
    if (!code) return;
    if (/type=["']application\/(ld\+json|json)["']/.test(m[0])) return;
    if (/type=["']module["']/.test(m[0])) return;
    try {
      new vm.Script('(function(){' + code + '\n})', { filename: rel + '#script[' + idx + ']' });
    } catch(e) {
      errors.push(rel + '#script[' + idx + ']: JS syntax error - ' + e.message.split('\n')[0]);
    }
  });

  const isRepoRoot = !rel.includes('/');
  if (isRepoRoot) {
    const required = CRITICAL_REQUIRED_ASSETS[path.basename(file)];
    if (required) {
      for (const asset of required) {
        if (content.indexOf(asset) === -1) errors.push(rel + ': missing critical asset: ' + asset);
      }
    }
  }

  const deadCtas = [...content.matchAll(/<a[^>]*\bclass="[^"]*\btier__cta\b[^"]*"[^>]*>/gi)];
  deadCtas.forEach((cta, i) => {
    const tag = cta[0];
    const hrefMatch = tag.match(/href="([^"]+)"/);
    if (!hrefMatch) { warnings.push(rel + ': tier__cta #' + i + ' has no href'); return; }
    const href = hrefMatch[1];
    if (href.startsWith('#checkout-')) errors.push(rel + ': tier__cta #' + i + ' uses dead anchor href="' + href + '"');
  });
}

const files = listHtmlFiles(ROOT);
console.log('Validating ' + files.length + ' HTML files...');
files.forEach(check);

if (warnings.length) {
  console.log('\nWARNINGS:');
  warnings.forEach(w => console.log('  - ' + w));
}
if (errors.length) {
  console.log('\nERRORS (' + errors.length + '):');
  errors.forEach(e => console.log('  - ' + e));
  console.log('\nFix these before committing.');
  process.exit(1);
}
console.log('\nAll ' + files.length + ' pages valid.');
process.exit(0);
