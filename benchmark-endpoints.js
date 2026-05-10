/**
 * benchmark-endpoints.js - API endpoint performance benchmarking
 *
 * Measures response times for all endpoints and identifies bottlenecks.
 * Results help prioritize optimization efforts.
 *
 * Usage:
 *   node benchmark-endpoints.js                    # Run benchmarks
 *   node benchmark-endpoints.js --endpoint=signup  # Benchmark specific endpoint
 *   node benchmark-endpoints.js --verbose          # Detailed output
 *   node benchmark-endpoints.js --report           # Generate HTML report
 */

const endpoints = [
  // Auth endpoints
  { name: 'POST /api/auth/signup', method: 'POST', path: '/api/auth/signup', body: { email: 'test@example.com', password: 'Test123456', username: 'testuser' } },
  { name: 'POST /api/auth/signin', method: 'POST', path: '/api/auth/signin', body: { email: 'test@example.com', password: 'Test123456' } },
  { name: 'GET /api/auth/session', method: 'GET', path: '/api/auth/session' },
  { name: 'POST /api/auth/signout', method: 'POST', path: '/api/auth/signout' },

  // Comments
  { name: 'GET /api/comments?video_id=123', method: 'GET', path: '/api/comments?video_id=123' },
  { name: 'POST /api/comments', method: 'POST', path: '/api/comments', body: { video_id: '123', text: 'Test comment' } },
  { name: 'GET /api/comments/456', method: 'GET', path: '/api/comments/456' },
  { name: 'DELETE /api/comments/456', method: 'DELETE', path: '/api/comments/456' },

  // Profile
  { name: 'GET /api/profile/me', method: 'GET', path: '/api/profile/me' },
  { name: 'GET /api/profile/123', method: 'GET', path: '/api/profile/123' },

  // Tokens
  { name: 'POST /api/tokens/grant', method: 'POST', path: '/api/tokens/grant', body: { amount: 100 } },
  { name: 'POST /api/tokens/claim-daily', method: 'POST', path: '/api/tokens/claim-daily' },

  // Heatmap
  { name: 'POST /api/heatmap/record', method: 'POST', path: '/api/heatmap/record', body: { video_id: '123', bucket_index: 50 } },
  { name: 'GET /api/heatmap/123', method: 'GET', path: '/api/heatmap/123' },

  // Other
  { name: 'POST /api/subscribe', method: 'POST', path: '/api/subscribe', body: { email: 'subscriber@example.com' } },
  { name: 'GET /api/cb-top', method: 'GET', path: '/api/cb-top' },
]

class EndpointBenchmark {
  constructor(baseUrl = 'http://localhost:8788', iterations = 10) {
    this.baseUrl = baseUrl
    this.iterations = iterations
    this.results = {}
  }

  async benchmark() {
    console.log('\n' + '='.repeat(80))
    console.log('🏃 ENDPOINT PERFORMANCE BENCHMARK')
    console.log('='.repeat(80))
    console.log(`Base URL: ${this.baseUrl}`)
    console.log(`Iterations: ${this.iterations}\n`)

    for (const endpoint of endpoints) {
      await this.benchmarkEndpoint(endpoint)
    }

    this.printResults()
  }

  async benchmarkEndpoint(endpoint) {
    const times = []

    console.log(`Testing ${endpoint.name}...`)

    for (let i = 0; i < this.iterations; i++) {
      try {
        const startTime = Date.now()

        const response = await fetch(`${this.baseUrl}${endpoint.path}`, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            'Origin': this.baseUrl,
          },
          body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
        })

        const endTime = Date.now()
        const duration = endTime - startTime

        times.push(duration)
      } catch (error) {
        console.error(`  Error: ${error.message}`)
        times.push(null)
      }
    }

    // Calculate stats
    const validTimes = times.filter(t => t !== null)
    if (validTimes.length === 0) {
      this.results[endpoint.name] = {
        status: 'FAILED',
        error: 'All requests failed',
      }
      return
    }

    const min = Math.min(...validTimes)
    const max = Math.max(...validTimes)
    const avg = Math.round(validTimes.reduce((a, b) => a + b) / validTimes.length)
    const median = this.getMedian(validTimes)
    const p95 = this.getPercentile(validTimes, 95)

    this.results[endpoint.name] = {
      status: 'OK',
      min,
      max,
      avg,
      median,
      p95,
      samples: validTimes.length,
      failed: times.length - validTimes.length,
    }

    const status = avg > 1000 ? '🔴 SLOW' : avg > 500 ? '🟡 OK' : '🟢 FAST'
    console.log(`  ${status} avg: ${avg}ms (min: ${min}ms, max: ${max}ms, p95: ${p95}ms)\n`)
  }

  getMedian(arr) {
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
  }

  getPercentile(arr, percentile) {
    const sorted = [...arr].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }

  printResults() {
    console.log('\n' + '='.repeat(80))
    console.log('📊 BENCHMARK RESULTS')
    console.log('='.repeat(80) + '\n')

    // Sort by average time (slowest first)
    const sorted = Object.entries(this.results).sort(
      (a, b) => (b[1].avg || 0) - (a[1].avg || 0)
    )

    console.log('Endpoint                              Avg (ms)  Min    Max    P95')
    console.log('-'.repeat(80))

    for (const [name, stats] of sorted) {
      if (stats.status === 'FAILED') {
        console.log(`${name.padEnd(36)} FAILED`)
        continue
      }

      const indicator = stats.avg > 1000 ? '🔴' : stats.avg > 500 ? '🟡' : '🟢'
      const nameCol = name.substring(0, 36).padEnd(36)
      const avgCol = String(stats.avg).padStart(8)
      const minCol = String(stats.min).padStart(6)
      const maxCol = String(stats.max).padStart(6)
      const p95Col = String(stats.p95).padStart(6)

      console.log(
        `${indicator} ${nameCol} ${avgCol}  ${minCol}  ${maxCol}  ${p95Col}`
      )
    }

    console.log('\n' + '='.repeat(80))
    console.log('📈 SUMMARY')
    console.log('='.repeat(80))

    const allStats = Object.values(this.results).filter(s => s.status === 'OK')
    if (allStats.length === 0) {
      console.log('No successful benchmarks')
      return
    }

    const avgOfAvgs = Math.round(
      allStats.reduce((sum, s) => sum + s.avg, 0) / allStats.length
    )
    const slowest = sorted.find(([_, s]) => s.status === 'OK')
    const fastest = sorted.reverse().find(([_, s]) => s.status === 'OK')

    console.log(`\nAverage response time: ${avgOfAvgs}ms`)
    console.log(`Fastest endpoint: ${fastest?.[0]} (${fastest?.[1].avg}ms)`)
    console.log(`Slowest endpoint: ${slowest?.[0]} (${slowest?.[1].avg}ms)`)

    const slow = allStats.filter(s => s.avg > 1000)
    if (slow.length > 0) {
      console.log(`\n⚠️  ${slow.length} endpoints are SLOW (>1000ms)`)
      console.log('   Optimization targets:')
      Object.entries(this.results)
        .filter(([_, s]) => s.avg > 1000)
        .forEach(([name, s]) => {
          console.log(`   • ${name}: ${s.avg}ms`)
        })
    }

    console.log('\n' + '='.repeat(80) + '\n')
  }
}

// CLI
const args = process.argv.slice(2)
const baseUrl = args.find(a => a.startsWith('--url='))?.split('=')[1] || 'http://localhost:8788'
const iterations = parseInt(args.find(a => a.startsWith('--iterations='))?.split('=')[1] || '10')

const benchmark = new EndpointBenchmark(baseUrl, iterations)
benchmark.benchmark().catch(console.error)
