import { authenticate } from '../../_lib/auth.js'
import { json, preflight, readJSON } from '../../_lib/http.js'
import { Errors } from '../../_lib/errors.js'
import { logger } from '../../_lib/logger.js'

const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_ORIGINS = ['https://alexiatwerkgroup.com', 'https://www.alexiatwerkgroup.com', 'http://localhost:8788', 'http://localhost:3000']

function dataUrlToBytes(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!m) return null
  const mime = m[1].toLowerCase()
  if (!ALLOWED_MIME.includes(mime)) return null
  const b64 = m[2]
  try {
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return { bytes, mime }
  } catch {
    return null
  }
}

function extFromMime(mime) {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'bin'
}

export async function onRequest(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  if (request.method === 'OPTIONS') return preflight(allowedOrigin)
  if (request.method !== 'POST') return json(Errors.METHOD_NOT_ALLOWED.toJSON(), 405, allowedOrigin)
  if (!env.DB) {
    logger.error('avatar.upload', 'DB binding missing')
    return json(Errors.D1_BINDING_MISSING.toJSON(), 500, allowedOrigin)
  }
  if (!env.AVATARS) {
    logger.error('avatar.upload', 'R2 binding missing')
    return json({ ok: false, error: 'r2_binding_missing' }, 500, allowedOrigin)
  }

  const me = await authenticate(request, env)
  if (!me || !me.sub) {
    logger.warn('avatar.upload', 'Unauthenticated request')
    return json(Errors.UNAUTHORIZED.toJSON(), 401, allowedOrigin)
  }

  let bytes = null
  let mime = null
  const contentType = request.headers.get('Content-Type') || ''

  if (contentType.includes('application/json')) {
    const body = await readJSON(request)
    if (!body || !body.data) {
      logger.warn('avatar.upload', 'Missing data', { user: me.sub })
      return json(Errors.MISSING_FIELD('data').toJSON(), 400, allowedOrigin)
    }
    const decoded = dataUrlToBytes(body.data)
    if (!decoded) {
      logger.warn('avatar.upload', 'Invalid data URL', { user: me.sub })
      return json({ ok: false, error: 'invalid_data_url' }, 400, allowedOrigin)
    }
    bytes = decoded.bytes
    mime = decoded.mime
  } else if (contentType.includes('multipart/form-data')) {
    try {
      const form = await request.formData()
      const file = form.get('file')
      if (!file || typeof file === 'string') {
        logger.warn('avatar.upload', 'No file in multipart', { user: me.sub })
        return json(Errors.MISSING_FIELD('file').toJSON(), 400, allowedOrigin)
      }
      if (!ALLOWED_MIME.includes(file.type)) {
        logger.warn('avatar.upload', 'Unsupported MIME', { user: me.sub, mime: file.type })
        return json({ ok: false, error: 'unsupported_mime', detail: file.type }, 400, allowedOrigin)
      }
      bytes = new Uint8Array(await file.arrayBuffer())
      mime = file.type
    } catch (e) {
      logger.error('avatar.upload', 'Multipart parse failed', { error: e.message })
      return json({ ok: false, error: 'multipart_parse_failed' }, 400, allowedOrigin)
    }
  } else {
    logger.warn('avatar.upload', 'Unsupported content type', { type: contentType })
    return json({ ok: false, error: 'unsupported_content_type' }, 415, allowedOrigin)
  }

  if (!bytes || bytes.length === 0) {
    logger.warn('avatar.upload', 'Empty payload', { user: me.sub })
    return json(Errors.INVALID_INPUT.toJSON(), 400, allowedOrigin)
  }

  if (bytes.length > MAX_BYTES) {
    logger.warn('avatar.upload', 'Too large', { user: me.sub, size: bytes.length, max: MAX_BYTES })
    return json({ ok: false, error: 'too_large', max: MAX_BYTES }, 413, allowedOrigin)
  }

  const ext = extFromMime(mime)
  const key = `avatars/${me.sub}/${Date.now()}.${ext}`

  try {
    await env.AVATARS.put(key, bytes, {
      httpMetadata: {
        contentType: mime,
        cacheControl: 'public, max-age=31536000, immutable',
      },
    })
    logger.debug('avatar.upload', 'Uploaded to R2', { user: me.sub, key, size: bytes.length })
  } catch (e) {
    logger.error('avatar.upload', 'R2 put failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  const siteOrigin = (env.SITE_URL || 'https://alexiatwerkgroup.com').replace(/\/+$/, '')
  const publicBase = env.AVATARS_PUBLIC_BASE ? String(env.AVATARS_PUBLIC_BASE).replace(/\/+$/, '') : `${siteOrigin}/avatars`
  const publicUrl = `${publicBase}/${me.sub}/${key.split('/').slice(-1)[0]}`

  try {
    await env.DB.prepare('UPDATE profiles SET avatar_url = ?, last_active_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(publicUrl, me.sub)
      .run()
    logger.info('avatar.upload', 'Avatar updated', { user: me.sub, url: publicUrl })
  } catch (e) {
    logger.error('avatar.upload', 'DB update failed', { error: e.message })
    return json(Errors.INTERNAL_ERROR.toJSON(), 500, allowedOrigin)
  }

  return json({ ok: true, url: publicUrl, key }, 200, allowedOrigin)
}
