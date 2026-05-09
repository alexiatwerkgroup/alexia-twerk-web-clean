// TWERKHUB · one-time auth tokens (password reset / email verification)
// 2026-05-08 · Phase 4a
//
// generateToken()       → { raw, hash }  // raw goes in email, hash goes in DB
// hashToken(raw)        → hex sha256
// createTokenRow(env, userId, kind, expiresInSec) → raw token to email
// consumeToken(env, raw, kind) → { userId } or null

import { uuidv4 } from './auth.js';

function bytesToHex(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
  return s;
}

export async function hashToken(raw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return bytesToHex(new Uint8Array(buf));
}

// 32 random bytes as base64url — collision-resistant + URL-safe
export function generateRawToken() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  let bin = '';
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function createTokenRow(env, userId, kind, expiresInSec) {
  const raw = generateRawToken();
  const hash = await hashToken(raw);
  const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

  // Invalidate older tokens of the same kind for this user (security: only
  // one active reset/verify token per user at a time).
  await env.DB.prepare(
    'UPDATE auth_tokens SET used = 1 WHERE user_id = ? AND kind = ? AND used = 0'
  )
    .bind(userId, kind)
    .run();

  await env.DB.prepare(
    'INSERT INTO auth_tokens (token_hash, user_id, kind, expires_at, used) VALUES (?, ?, ?, ?, 0)'
  )
    .bind(hash, userId, kind, expiresAt)
    .run();

  return raw;
}

export async function consumeToken(env, raw, kind) {
  if (!raw || typeof raw !== 'string' || raw.length < 16) return null;
  const hash = await hashToken(raw);
  const row = await env.DB.prepare(
    'SELECT user_id, kind, expires_at, used FROM auth_tokens WHERE token_hash = ?'
  )
    .bind(hash)
    .first();

  if (!row) return null;
  if (row.used) return null;
  if (row.kind !== kind) return null;
  if (Date.parse(row.expires_at + 'Z') < Date.now()) return null;

  // Mark as used (one-shot)
  await env.DB.prepare('UPDATE auth_tokens SET used = 1 WHERE token_hash = ?')
    .bind(hash)
    .run();

  return { userId: row.user_id };
}
