#!/usr/bin/env node
/**
 * TWERKHUB · check-encoding.js
 * Detects mojibake patterns and UTF-8 BOM in source files.
 * Exit code 1 if any issues found.
 *
 * Usage:
 *   node scripts/check-encoding.js                  # scan all text files
 *   node scripts/check-encoding.js file1 file2 ...  # scan specific files
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const MOJIBAKE_MARKERS = [
  'ðŸ', 'â€', 'â†', 'â—', 'â˜', 'âœ', 'âš',
  'Â·', 'Â ',
  'Ã©', 'Ã¡', 'Ã­', 'Ã³', 'Ãº', 'Ã±',
  'Ã‰', 'Ã', 'Ã',
  'Ð'
];

const EXCLUDE_DIRS = new Set(['.git', 'node_modules', '_backups', '__pycache__', '.next', 'dist', 'build']);
const TEXT_EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs', '.json', '.xml', '.svg', '.md', '.txt', '.yml', '.yaml']);

const SKIP_FILES = new Set([
  'scripts/check-encoding.js',
  'scripts/CONTRIBUTING-ENCODING.md',
  'scripts/validate-pages.js',
  'scripts/fix-mojibake.py',
  'scripts/fix-encoding-v3.py',
  'scripts/fix-emojis.py',
  // Legacy known-bad (pre-existing, not from recent corruption — see scripts/CONTRIBUTING-ENCODING.md):
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

function isSkipped(absPath) {
  const rel = path.relative(ROOT, absPath).split(path.sep).join('/');
  return SKIP_FILES.has(rel);
}

function listFiles(dir, out) {
  out = out || [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (e) { return out; }
  for (const entry of entries) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith('.') && entry.name !== '.gitattributes' && entry.name !== '.editorconfig') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, out);
    else if (TEXT_EXTENSIONS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function checkFile(filePath) {
  if (isSkipped(filePath)) return [];
  const issues = [];
  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); }
  catch (e) { return ['cannot read: ' + e.message]; }

  if (content.charCodeAt(0) === 0xFEFF) {
    issues.push('starts with UTF-8 BOM (should be removed)');
  }

  for (const marker of MOJIBAKE_MARKERS) {
    const re = new RegExp(escapeRegex(marker), 'g');
    const matches = content.match(re);
    if (matches && matches.length > 0) {
      const idx = content.indexOf(marker);
      const ctx = content.slice(Math.max(0, idx - 25), idx + 25).replace(/\n/g, '\\n');
      issues.push(matches.length + 'x mojibake marker, first near: ' + ctx);
      break;
    }
  }

  const replCount = (content.match(/�/g) || []).length;
  if (replCount > 0) {
    issues.push(replCount + 'x replacement char U+FFFD (lossy encoding conversion)');
  }

  return issues;
}

let files;
if (process.argv.length > 2) {
  files = process.argv.slice(2)
    .map(f => path.isAbsolute(f) ? f : path.join(ROOT, f))
    .filter(f => TEXT_EXTENSIONS.has(path.extname(f)) && fs.existsSync(f));
} else {
  files = listFiles(ROOT);
}

console.log('Checking encoding in ' + files.length + ' file(s)...');

let totalIssues = 0;
const dirtyFiles = [];

for (const file of files) {
  const issues = checkFile(file);
  if (issues.length > 0) {
    dirtyFiles.push({ file: path.relative(ROOT, file), issues: issues });
    totalIssues += issues.length;
  }
}

if (dirtyFiles.length === 0) {
  console.log('\nAll ' + files.length + ' files clean (UTF-8, no mojibake, no BOM).');
  process.exit(0);
}

console.log('\nFound issues in ' + dirtyFiles.length + ' file(s) (' + totalIssues + ' total):\n');
for (const item of dirtyFiles.slice(0, 30)) {
  console.log('  ' + item.file + ':');
  for (const issue of item.issues) console.log('    - ' + issue);
}
if (dirtyFiles.length > 30) {
  console.log('\n  ... and ' + (dirtyFiles.length - 30) + ' more files.');
}
console.log('\nFix:');
console.log('  Mojibake: re-save the file as UTF-8 (no BOM) or run cp1252 round-trip.');
console.log('  BOM: open in editor and save without BOM.');
console.log('  PowerShell rule: ALWAYS use -Encoding UTF8 or [System.IO.File]::WriteAllText with UTF8Encoding(false).');
process.exit(1);
