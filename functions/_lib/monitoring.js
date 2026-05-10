/**
 * Monitoring and alerting setup for Twerkhub
 *
 * Integrates with Cloudflare Workers Analytics to track:
 * - API error rates and response times
 * - Rate limiting violations
 * - Database query performance
 * - Authentication failures
 * - User activity patterns
 *
 * Place this in functions/_lib/monitoring.js and import in endpoints
 */

/**
 * Monitoring service for APIs
 * Tracks metrics and sends alerts for anomalies
 */
export class MonitoringService {
  constructor(env) {
    this.env = env
    this.startTime = Date.now()
    this.alerts = []
  }

  /**
   * Track an API request
   * @param {string} endpoint - API endpoint name
   * @param {string} method - HTTP method
   * @param {number} status - HTTP status code
   * @param {number} duration - Response time in ms
   * @param {object} context - Additional context (user_id, error, etc.)
   */
  async trackRequest(endpoint, method, status, duration, context = {}) {
    const metric = {
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      status,
      duration_ms: duration,
      ...context,
    }

    // Log to Workers Analytics (via console)
    console.log(JSON.stringify({
      type: 'METRIC',
      category: 'api_request',
      ...metric,
    }))

    // Check for anomalies
    this._checkAnomalies(endpoint, metric)
  }

  /**
   * Track an error
   */
  async trackError(endpoint, error, context = {}) {
    console.error(JSON.stringify({
      type: 'ERROR',
      category: 'api_error',
      endpoint,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...context,
    }))

    // Alert if critical
    if (error.message.includes('database') || error.message.includes('jwt')) {
      await this._sendAlert('CRITICAL', `${endpoint}: ${error.message}`)
    }
  }

  /**
   * Track rate limit hit
   */
  async trackRateLimit(key, limit, period) {
    console.warn(JSON.stringify({
      type: 'RATE_LIMIT',
      key,
      limit,
      period_sec: period,
      timestamp: new Date().toISOString(),
    }))

    await this._sendAlert('WARNING', `Rate limit exceeded: ${key}`)
  }

  /**
   * Check for performance anomalies
   */
  _checkAnomalies(endpoint, metric) {
    // Alert if response time > 1 second
    if (metric.duration_ms > 1000) {
      this.alerts.push({
        severity: 'WARNING',
        message: `${endpoint} slow response: ${metric.duration_ms}ms`,
        metric,
      })
    }

    // Alert on 5xx errors
    if (metric.status >= 500) {
      this.alerts.push({
        severity: 'CRITICAL',
        message: `${endpoint} returned ${metric.status}`,
        metric,
      })
    }

    // Alert on auth failures
    if (metric.status === 401 && metric.endpoint?.includes('auth')) {
      this.alerts.push({
        severity: 'WARNING',
        message: `Authentication failure on ${endpoint}`,
        metric,
      })
    }
  }

  /**
   * Send alert to monitoring system
   * (In production: Slack, PagerDuty, email, etc.)
   */
  async _sendAlert(severity, message) {
    console.error(JSON.stringify({
      type: 'ALERT',
      severity,
      message,
      timestamp: new Date().toISOString(),
    }))

    // TODO: Integrate with external alerting service
    // Example: Send to Slack webhook
    // const webhookUrl = this.env.SLACK_WEBHOOK_URL
    // if (webhookUrl) {
    //   await fetch(webhookUrl, {
    //     method: 'POST',
    //     body: JSON.stringify({ text: `[${severity}] ${message}` })
    //   })
    // }
  }

  /**
   * Get monitoring summary
   */
  getSummary() {
    return {
      uptime_ms: Date.now() - this.startTime,
      active_alerts: this.alerts.length,
      alerts: this.alerts,
    }
  }
}

/**
 * Middleware: Wrap endpoint handler with monitoring
 * Usage:
 *   const handler = monitorEndpoint('comments.list', async () => {...})
 */
export function monitorEndpoint(endpointName, handler) {
  return async (context) => {
    const { request, env } = context
    const startTime = Date.now()
    const monitoring = new MonitoringService(env)

    try {
      const response = await handler(context)
      const duration = Date.now() - startTime

      // Track successful request
      await monitoring.trackRequest(
        endpointName,
        request.method,
        response.status || 200,
        duration,
        { user_agent: request.headers.get('User-Agent') }
      )

      return response
    } catch (error) {
      const duration = Date.now() - startTime

      // Track error
      await monitoring.trackError(endpointName, error, {
        duration_ms: duration,
        method: request.method,
      })

      // Re-throw
      throw error
    }
  }
}

/**
 * Performance thresholds (configurable)
 */
export const PERFORMANCE_THRESHOLDS = {
  'api.signup': 500,        // 500ms
  'api.signin': 300,        // 300ms
  'api.comments.list': 200, // 200ms
  'api.comments.create': 500,
  'db.query': 100,          // 100ms for DB queries
}

/**
 * Alert channels configuration
 */
export const ALERT_CHANNELS = {
  critical: ['slack', 'pagerduty', 'email'],
  warning: ['slack', 'log'],
  info: ['log'],
}

/**
 * Example: Track database query performance
 * Usage in endpoints:
 *
 * const startTime = Date.now()
 * const result = await env.DB.prepare(...).first()
 * const duration = Date.now() - startTime
 * monitoring.trackDatabaseQuery('users.getByEmail', duration)
 */
export function trackDatabaseQuery(monitor, queryName, duration) {
  if (duration > PERFORMANCE_THRESHOLDS['db.query']) {
    console.warn(JSON.stringify({
      type: 'SLOW_QUERY',
      query: queryName,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    }))
  }
}
