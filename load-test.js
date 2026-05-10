/**
 * load-test.js - k6 load testing script for API endpoints
 *
 * Tests API performance under load.
 * Usage:
 *   k6 run load-test.js
 *   k6 run --vus=100 --duration=30s load-test.js  (100 virtual users for 30s)
 *   k6 run -e BASE_URL=http://localhost:8788 load-test.js
 *
 * Install k6: https://k6.io/docs/getting-started/installation/
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter, Gauge } from 'k6/metrics'

// ============================================================================
// CONFIG
// ============================================================================
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8788'

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m30s', target: 30 }, // Ramp up to 30 users
    { duration: '1m', target: 30 },    // Stay at 30 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s
    http_req_failed: ['rate<0.1'], // Error rate < 10%
  },
}

// ============================================================================
// METRICS
// ============================================================================
const errorRate = new Rate('errors')
const requestDuration = new Trend('request_duration')
const requestCount = new Counter('requests')
const activeVUs = new Gauge('active_vus')

// ============================================================================
// TEST SCENARIOS
// ============================================================================

// Scenario 1: Public endpoints (no auth needed)
function testPublicEndpoints() {
  // Get comments
  const commentRes = http.get(`${BASE_URL}/api/comments?video_id=test-video-1`)
  check(commentRes, {
    'comments: status 200': (r) => r.status === 200,
    'comments: response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1)

  requestDuration.add(commentRes.timings.duration)
  requestCount.add(1)
  activeVUs.add(1)

  sleep(1)

  // Get heatmap
  const heatmapRes = http.get(`${BASE_URL}/api/heatmap/test-video-1`)
  check(heatmapRes, {
    'heatmap: status 200': (r) => r.status === 200,
    'heatmap: response time < 300ms': (r) => r.timings.duration < 300,
  }) || errorRate.add(1)

  requestDuration.add(heatmapRes.timings.duration)
  requestCount.add(1)

  sleep(1)

  // Get public profile
  const profileRes = http.get(`${BASE_URL}/api/profile/test-user`)
  check(profileRes, {
    'profile: status 200 or 404': (r) => [200, 404].includes(r.status),
    'profile: response time < 300ms': (r) => r.timings.duration < 300,
  }) || errorRate.add(1)

  requestDuration.add(profileRes.timings.duration)
  requestCount.add(1)

  sleep(1)
}

// Scenario 2: Write operations (comments, tokens, etc.)
function testWriteOperations() {
  const comment = {
    video_id: 'test-video-1',
    text: `Load test comment ${Date.now()}`,
  }

  const commentRes = http.post(`${BASE_URL}/api/comments`, JSON.stringify(comment), {
    headers: { 'Content-Type': 'application/json' },
  })

  check(commentRes, {
    'create comment: status 201 or 401': (r) => [201, 401].includes(r.status),
    'create comment: response time < 1000ms': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1)

  requestDuration.add(commentRes.timings.duration)
  requestCount.add(1)

  sleep(1)

  // Subscribe
  const subscribe = {
    email: `subscriber-${Date.now()}@example.com`,
  }

  const subscribeRes = http.post(`${BASE_URL}/api/subscribe`, JSON.stringify(subscribe), {
    headers: { 'Content-Type': 'application/json' },
  })

  check(subscribeRes, {
    'subscribe: status 200 or 400': (r) => [200, 400].includes(r.status),
    'subscribe: response time < 800ms': (r) => r.timings.duration < 800,
  }) || errorRate.add(1)

  requestDuration.add(subscribeRes.timings.duration)
  requestCount.add(1)

  sleep(1)
}

// Scenario 3: Session/Auth endpoints
function testSessionEndpoints() {
  // Check session (no auth header, should fail gracefully)
  const sessionRes = http.get(`${BASE_URL}/api/auth/session`)

  check(sessionRes, {
    'session: status 401': (r) => r.status === 401,
    'session: response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1)

  requestDuration.add(sessionRes.timings.duration)
  requestCount.add(1)

  sleep(1)

  // Check username availability
  const usernameRes = http.get(`${BASE_URL}/api/auth/username-available?username=testuser${Date.now()}`)

  check(usernameRes, {
    'username check: status 200': (r) => r.status === 200,
    'username check: response time < 300ms': (r) => r.timings.duration < 300,
  }) || errorRate.add(1)

  requestDuration.add(usernameRes.timings.duration)
  requestCount.add(1)

  sleep(1)
}

// ============================================================================
// MAIN LOAD TEST
// ============================================================================
export default function () {
  const scenario = Math.random()

  if (scenario < 0.5) {
    testPublicEndpoints()
  } else if (scenario < 0.8) {
    testWriteOperations()
  } else {
    testSessionEndpoints()
  }
}

// ============================================================================
// SUMMARY
// ============================================================================
export function handleSummary(data) {
  console.log('='.repeat(80))
  console.log('📊 LOAD TEST SUMMARY')
  console.log('='.repeat(80))
  console.log(`\nTotal Requests: ${data.metrics.requests.value}`)
  console.log(`Error Rate: ${(data.metrics.errors.value * 100).toFixed(2)}%`)
  console.log(`Avg Duration: ${data.metrics.request_duration.values.mean.toFixed(2)}ms`)
  console.log(`P95 Duration: ${data.metrics.request_duration.values['p(95)'].toFixed(2)}ms`)
  console.log(`P99 Duration: ${data.metrics.request_duration.values['p(99)'].toFixed(2)}ms`)

  // Return metrics in JSON format
  return {
    '/tmp/summary.json': JSON.stringify(data.metrics, null, 2),
  }
}
