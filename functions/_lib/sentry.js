export class SentryClient {
  constructor(env) {
    this.env = env
    this.dsn = env.SENTRY_DSN || ''
    this.enabled = !!env.SENTRY_DSN
  }

  async captureException(error, context = {}) {
    if (!this.enabled) return
    console.error('Error captured:', error.message)
  }

  async captureMessage(message, level = 'info') {
    if (!this.enabled) return
    console.log(`[${level.toUpperCase()}] ${message}`)
  }

  capturePerformance(data) {
    if (!this.enabled) return
    if (data.duration > 1000) {
      console.warn(`Slow endpoint: ${data.endpoint} (${data.duration}ms)`)
    }
  }
}

export function createSentryMiddleware(env) {
  const sentry = new SentryClient(env)
  return async (request, handler) => {
    try {
      const response = await handler(request)
      return response
    } catch (error) {
      await sentry.captureException(error, { request })
      throw error
    }
  }
}
