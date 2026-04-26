#!/usr/bin/env node
/* TWERKHUB Auto-repair tool
 *
 * Fixes the most common file corruption patterns we have seen:
 *   1. NULL bytes at end of file (OneDrive sync corruption)
 *   2. Files truncated mid-tag (rebuilds </body></html>)
 *   3. Pages missing the watchdog asset reference (adds it before </body>)
 *
 * Idempotent. Safe to run repeatedly.
 *
 * Usage:  node scripts/repair-pages.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const NUL = String.fromCharCode(0);
const WATCHDOG_TAG = '<script defer src="/assets/twerkhub-watchdog.js?v=20260426-p1"></script>';

function listHtmlFiles(dir, out){
  out = out || [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listHtmlFiles(full, out);
    } else if (entry.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

let fixed = 0;
let nullStripped = 0;
let closingAdded = 0;
let watchdogAdded = 0;

function repair(file){
  const rel = path.relative(ROOT, file);
  let content;
  try { content = fs.readFileSync(file, 'utf8'); }
  catch(e){ console.warn('SKIP ' + rel + ': ' + e.message); return; }

  const original = content;

  // 1) Strip ALL NULL bytes (OneDrive sync corruption)
  if (content.indexOf(NUL) !== -1) {
    content = content.split(NUL).join('');
    nullStripped++;
  }

  // Trim trailing whitespace before structural fixes
  content = content.replace(/[\s]+$/, '\n');

  // 2) Ensure file ends with </body></html>
  const hasBody = /<\/body>/i.test(content);
  const hasHtml = /<\/html>/i.test(content);
  if (!hasBody && !hasHtml) {
    content = content.replace(/\s*$/, '\n</body>\n</html>\n');
    closingAdded++;
  } else if (hasBody && !hasHtml) {
    content = content.replace(/\s*$/, '\n</html>\n');
    closingAdded++;
  } else if (!hasBody && hasHtml) {
    content = content.replace(/<\/html>/i, '</body>\n</html>');
    closingAdded++;
  } else {
    // Both exist — ensure they're at the very end (in case there's garbage after)
    const lastHtmlIdx = content.toLowerCase().lastIndexOf('</html>');
    if (lastHtmlIdx + '</html>'.length < content.replace(/\s+$/, '').length) {
      content = content.slice(0, lastHtmlIdx + '</html>'.length) + '\n';
      closingAdded++;
    }
  }

  // 3) Inject watchdog if not present (any page benefits)
  if (content.indexOf('twerkhub-watchdog.js') === -1) {
    content = content.replace(/(\s*<\/body>)/i, '\n' + WATCHDOG_TAG + '$1');
    watchdogAdded++;
  }

  if (content !== original) {
    fs.writeFileSync(file, content);
    fixed++;
    console.log('OK ' + rel);
  }
}

const files = listHtmlFiles(ROOT);
console.log('Scanning ' + files.length + ' HTML files...');
files.forEach(repair);

console.log('\nREPAIR SUMMARY');
console.log('  Files modified:           ' + fixed);
console.log('  NULL bytes stripped from: ' + nullStripped + ' files');
console.log('  Closing tags added to:    ' + closingAdded + ' files');
console.log('  Watchdog injected into:   ' + watchdogAdded + ' files');
process.exit(0);
