/**
 * Centralized logging for Twerkhub API
 * All logs go to stdout (captured by Cloudflare)
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// Set via env variable or default to info
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'info']

function formatMessage(level, context, message, data = {}) {
  const timestamp = new Date().toISOString()
  const level_str = level.toUpperCase().padEnd(5)
  const ctx = context ? ` [${context}]` : ''
  
  return {
    timestamp,
    level: level_str,
    context: ctx,
    message,
    data: Object.keys(data).length > 0 ? data : undefined,
  }
}

export const logger = {
  debug(context, message, data) {
    if (CURRENT_LEVEL <= LOG_LEVELS.debug) {
      console.log(JSON.stringify(formatMessage('debug', context, message, data)))
    }
  },

  info(context, message, data) {
    if (CURRENT_LEVEL <= LOG_LEVELS.info) {
      console.log(JSON.stringify(formatMessage('info', context, message, data)))
    }
  },

  warn(context, message, data) {
    if (CURRENT_LEVEL <= LOG_LEVELS.warn) {
      console.warn(JSON.stringify(formatMessage('warn', context, message, data)))
    }
  },

  error(context, message, data) {
    if (CURRENT_LEVEL <= LOG_LEVELS.error) {
      console.error(JSON.stringify(formatMessage('error', context, message, data)))
    }
  },

  // Structured logging for security events
  security(event, details) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'SECURITY',
      event,
      details,
    }))
  },

  // Structured logging for performance monitoring
  metric(name, value, unit = 'ms') {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'METRIC',
      name,
      value,
      unit,
    }))
  },
}
