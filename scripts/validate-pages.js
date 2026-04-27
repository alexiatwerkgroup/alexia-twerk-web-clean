#!/usr/bin/env node
/* TWERKHUB Pre-deploy page validator */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SKIP_FILES = new Set([
  'HANDOFF-COWORK.md',
]);
const CRITICAL_REQUIRED_ASSETS = {
  'index.html': ['twerkhub-countdowns.js', 'twerkhub-watchdog.js'],
  'membership.html': ['twerkhub-watchdog.js']
};

const errors = [];
const warnings = [];


const GA4_ID = 'G-YSFR7FHCLS';
const UTILITY_PATTERNS = [
  /^admin/i, /^auth-/i, /^callback/i, /^login/i,
  /admin-/i, /callback/i, /auth-callback/i,
  /^paid-content/i, /^variants?-/i, /^oriental-final/i,
  /^playlist-model-1-dark-premium/i, /^premium-/i, /^savage-twerk-video/i,
  /^VARIANTE-/i, /^test-/i
];

function isUtilityPage(rel) {
  const name = path.basename(rel);
  return UTILITY_PATTERNS.some(p => p.test(name));
}

function checkGA4(content, rel) {
  if (isUtilityPage(rel)) return;
  const loaderRe = new RegExp('<script[^>]*src="https://www\\.googletagmanager\\.com/gtag/js\\?id=' + GA4_ID + '"', 'g');
  const loaders = (content.match(loaderRe) || []).length;
  const configs = (content.match(new RegExp("gtag\\(['\"]config['\"]\\s*,\\s*['\"]" + GA4_ID + "['\"]", 'g')) || []).length;
  if (loaders === 0) {
    errors.push(rel + ': missing GA4 snippet (id=' + GA4_ID + '). Add it before </head> or mark page as utility.');
  } else if (loaders > 1) {
    errors.push(rel + ': duplicate GA4 loader script (' + loaders + ' instances)');
  } else if (configs > 1) {
    errors.push(rel + ': duplicate GA4 config call (' + configs + ' instances)');
  }
}

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
  checkGA4(content, rel);

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
