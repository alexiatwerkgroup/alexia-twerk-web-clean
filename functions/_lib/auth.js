// TWERKHUB · auth helpers · Cloudflare Pages Function library
// 2026-05-08 · used by /functions/api/auth/* endpoints
//
// Provides:
//   hashPassword(password) → "pbkdf2$<iter>$<salt_b64>$<hash_b64>"
//   verifyPassword(password, stored) → boolean
//   signJWT(payload, secret, expiresInSec) → string
//   verifyJWT(token, secret) → payload | null
//   uuidv4() → string
//
// All Web Crypto — no external deps. Works inside Workers / Pages Functions.

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH = 'SHA-256';
const PBKDF2_KEY_BITS = 256;

// ──────────────────────────────────────────────────────────────────────────
// Base64 helpers (URL-safe variant for JWT)
// ──────────────────────────────────────────────────────────────────────────
function bytesToB64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function bytesToB64Url(bytes) {
  return bytesToB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64UrlToBytes(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4);
  return b64ToBytes(b64);
}
function strToB64Url(s) {
  return bytesToB64Url(new TextEncoder().encode(s));
}
function b64UrlToStr(b64url) {
  return new TextDecoder().decode(b64UrlToBytes(b64url));
}

// ──────────────────────────────────────────────────────────────────────────
// UUIDv4
// ──────────────────────────────────────────────────────────────────────────
export function uuidv4() {
  if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// ──────────────────────────────────────────────────────────────────────────
// PBKDF2 password hashing (Web Crypto)
// ──────────────────────────────────────────────────────────────────────────
async function deriveKey(password, salt, iterations) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: PBKDF2_HASH },
    baseKey,
    PBKDF2_KEY_BITS
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 6 || password.length > 256) {
    throw new Error('invalid_password_length');
  }
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const hash = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToB64(salt)}$${bytesToB64(hash)}`;
}

export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = parseInt(parts[1], 10);
  if (!iterations || iterations < 1000) return false;
  let salt, expected;
  try {
    salt = b64ToBytes(parts[2]);
    expected = b64ToBytes(parts[3]);
  } catch {
    return false;
  }
  const got = await deriveKey(password, salt, iterations);
  if (got.length !== expected.length) return false;
  // Constant-time compare
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ expected[i];
  return diff === 0;
}

// ──────────────────────────────────────────────────────────────────────────
// JWT (HS256) — signing & verification
// ──────────────────────────────────────────────────────────────────────────
async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signJWT(payload, secret, expiresInSec = 7 * 24 * 60 * 60) {
  if (!secret || typeof secret !== 'string' || secret.length < 16) {
    throw new Error('jwt_secret_too_short');
  }
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { iat: now, exp: now + expiresInSec, ...payload };
  const headerB64 = strToB64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadB64 = strToB64Url(JSON.stringify(fullPayload));
  const data = `${headerB64}.${payloadB64}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigB64 = bytesToB64Url(new Uint8Array(sig));
  return `${data}.${sigB64}`;
}

export async function verifyJWT(token, secret) {
  if (typeof token !== 'string' || !token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  let header, payload;
  try {
    header = JSON.parse(b64UrlToStr(headerB64));
    payload = JSON.parse(b64UrlToStr(payloadB64));
  } catch {
    return null;
  }
  if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify(
    'HMAC',
    key,
    b64UrlToBytes(sigB64),
    new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  );
  if (!ok) return null;
  if (typeof payload.exp === 'number' && Math.floor(Date.now() / 1000) >= payload.exp) return null;
  return payload;
}

// ──────────────────────────────────────────────────────────────────────────
// Cookie / Authorization extraction (for incoming requests)
// ──────────────────────────────────────────────────────────────────────────
export function extractToken(request) {
  // Authorization: Bearer <token>
  const auth = request.headers.get('Authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  // Cookie: twk_jwt=<token>
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(/(?:^|;\s*)twk_jwt=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export async function authenticate(request, env) {
  const secret = env.JWT_SECRET;
  if (!secret) return null;
  const token = extractToken(request);
  if (!token) return null;
  return verifyJWT(token, secret);
}
