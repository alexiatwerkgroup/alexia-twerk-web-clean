// TWERKHUB · Resend email client
// 2026-05-08 · Phase 4a
//
// Wraps the Resend HTTP API. Requires env.RESEND_API_KEY.
// Configurable sender via env.RESEND_FROM (default: 'TWERKHUB <noreply@alexiatwerkgroup.com>').
//
// Usage:
//   import { sendEmail, renderResetEmail, renderVerifyEmail } from '../../_lib/resend.js';
//   await sendEmail(env, { to, subject, html });

const DEFAULT_FROM = 'TWERKHUB <noreply@alexiatwerkgroup.com>';

export async function sendEmail(env, { to, subject, html, text }) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) throw new Error('resend_not_configured');
  const from = env.RESEND_FROM || DEFAULT_FROM;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || stripHtml(html),
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error('resend_api_error: ' + res.status + ' ' + errText.slice(0, 300));
  }
  return res.json();
}

function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// ─── Email templates ────────────────────────────────────────────────────
const BRAND_PINK = '#ff2d87';
const BRAND_ORANGE = '#ffb454';

function emailShell(title, bodyHtml, ctaUrl, ctaText) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;color:#f4f3f7;line-height:1.5">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#13131a;border-radius:16px;padding:40px 32px;box-shadow:0 8px 32px rgba(0,0,0,.35)">
        <tr><td>
          <div style="font-family:'Anton',Impact,sans-serif;font-size:32px;letter-spacing:.04em;color:#fff;text-transform:uppercase;margin-bottom:8px">
            TWERK<span style="background:linear-gradient(90deg,${BRAND_PINK},${BRAND_ORANGE});-webkit-background-clip:text;background-clip:text;color:transparent">HUB</span>
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:rgba(244,243,247,.55);text-transform:uppercase;margin-bottom:28px">${escapeHtml(title)}</div>
          ${bodyHtml}
          ${ctaUrl ? `
            <div style="margin:32px 0">
              <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,${BRAND_PINK},${BRAND_ORANGE});color:#000;text-decoration:none;font-weight:800;font-size:14px;letter-spacing:.06em;text-transform:uppercase;border-radius:999px">${escapeHtml(ctaText || 'Continue')}</a>
            </div>
            <div style="margin-top:14px;font-size:12px;color:rgba(244,243,247,.45);word-break:break-all">
              Or copy this link: <span style="color:rgba(244,243,247,.7)">${escapeHtml(ctaUrl)}</span>
            </div>` : ''}
          <div style="margin-top:36px;padding-top:20px;border-top:1px solid rgba(255,255,255,.08);font-size:11px;color:rgba(244,243,247,.4)">
            If you didn't request this email, you can safely ignore it. <br>
            © 2026 ALEXIA TWERK GROUP · alexiatwerkgroup.com · 18+
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderResetEmail({ resetUrl, username, expiresInMin }) {
  const expires = expiresInMin || 60;
  const body = `
    <h1 style="font-family:'Anton',Impact,sans-serif;font-size:42px;letter-spacing:.02em;color:#fff;margin:0 0 12px;line-height:1">Reset your <span style="background:linear-gradient(90deg,${BRAND_PINK},${BRAND_ORANGE});-webkit-background-clip:text;background-clip:text;color:transparent">password</span>.</h1>
    <p style="font-size:15px;color:rgba(244,243,247,.85);margin:0 0 14px">Hey${username ? ' <strong>' + escapeHtml(username) + '</strong>' : ''}, click the button below to set a new password.</p>
    <p style="font-size:13px;color:rgba(244,243,247,.55);margin:0">This link expires in ${expires} minutes and can only be used once.</p>`;
  return emailShell('Password Reset', body, resetUrl, 'Reset Password →');
}

export function renderVerifyEmail({ verifyUrl, username }) {
  const body = `
    <h1 style="font-family:'Anton',Impact,sans-serif;font-size:42px;letter-spacing:.02em;color:#fff;margin:0 0 12px;line-height:1">Welcome to <span style="background:linear-gradient(90deg,${BRAND_PINK},${BRAND_ORANGE});-webkit-background-clip:text;background-clip:text;color:transparent">TWERKHUB</span>.</h1>
    <p style="font-size:15px;color:rgba(244,243,247,.85);margin:0 0 14px">Hey${username ? ' <strong>' + escapeHtml(username) + '</strong>' : ''}, confirm your email to unlock your account and the welcome bonus of 200 tokens.</p>
    <p style="font-size:13px;color:rgba(244,243,247,.55);margin:0">This link expires in 24 hours.</p>`;
  return emailShell('Verify Email', body, verifyUrl, 'Verify Email →');
}
