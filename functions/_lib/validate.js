/**
 * Centralized input validation library
 * Replaces inline validation scattered across endpoints.
 */

export const SCHEMAS = {
  email: (v) => {
    if (typeof v !== 'string') return false
    if (v.length < 6 || v.length > 200) return false
    return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(v)
  },
  username: (v) => {
    if (typeof v !== 'string') return false
    if (v.length < 3 || v.length > 24) return false
    return /^[a-z0-9_.-]{3,24}$/i.test(v)
  },
  password: (v) => {
    if (typeof v !== 'string') return false
    return v.length >= 12 && v.length <= 256
  },
  comment: (v) => {
    if (typeof v !== 'string') return false
    const trimmed = v.trim()
    return trimmed.length >= 1 && trimmed.length <= 2000
  },
  url: (v) => {
    if (typeof v !== 'string') return false
    return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:')
  },
  id: (v) => {
    if (typeof v !== 'string' && typeof v !== 'number') return false
    return String(v).length > 0 && String(v).length <= 36
  },
  positive_int: (v) => {
    const num = Number(v)
    return Number.isInteger(num) && num > 0
  },
  int_0_100: (v) => {
    const num = Number(v)
    return Number.isInteger(num) && num >= 0 && num <= 100
  },
  boolean: (v) => {
    return typeof v === 'boolean' || v === 'true' || v === 'false'
  },
}

export function validate(input, schema_name) {
  if (!SCHEMAS[schema_name]) {
    throw new ValidationError('unknown_schema', `Unknown schema: ${schema_name}`)
  }
  if (!SCHEMAS[schema_name](input)) {
    throw new ValidationError('invalid_' + schema_name, `Invalid ${schema_name}`)
  }
  return true
}

export function validateObject(obj, rules) {
  const errors = {}
  const result = {}
  for (const [key, schema_name] of Object.entries(rules)) {
    const value = obj?.[key]
    try {
      validate(value, schema_name)
      result[key] = typeof value === 'string' ? value.trim() : value
    } catch (e) {
      errors[key] = e.code
    }
  }
  if (Object.keys(errors).length > 0) {
    throw new ValidationError('validation_failed', errors)
  }
  return result
}

export class ValidationError extends Error {
  constructor(code, detail) {
    super(detail)
    this.code = code
    this.detail = detail
    this.status = 400
  }
}

export function sanitizeText(text) {
  if (typeof text !== 'string') return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)))
}

export function assert(condition, error_code, detail) {
  if (!condition) {
    throw new ValidationError(error_code, detail)
  }
}
