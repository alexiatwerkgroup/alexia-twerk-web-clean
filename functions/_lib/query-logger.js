export class QueryLogger {
  constructor(env) {
    this.env = env
    this.queries = []
    this.slowThreshold = 100
  }

  async logQuery(query, params, duration, result) {
    const logEntry = {
      query: query.substring(0, 100),
      duration,
      isSlow: duration > this.slowThreshold,
    }
    
    this.queries.push(logEntry)
    
    if (logEntry.isSlow) {
      console.warn(`Slow query (${duration}ms): ${logEntry.query}`)
    }
    
    return logEntry
  }

  detectN1Patterns() {
    const patterns = {}
    for (const log of this.queries) {
      const pattern = log.query.substring(0, 50)
      patterns[pattern] = (patterns[pattern] || 0) + 1
    }
    
    const issues = []
    for (const [pattern, count] of Object.entries(patterns)) {
      if (count > 5) {
        issues.push({ pattern, count })
      }
    }
    
    return issues
  }

  getReport() {
    const slow = this.queries.filter(q => q.isSlow)
    return {
      totalQueries: this.queries.length,
      slowQueries: slow.length,
      n1Patterns: this.detectN1Patterns(),
    }
  }
}
