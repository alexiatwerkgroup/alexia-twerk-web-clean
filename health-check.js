#!/usr/bin/env node
const BASE_URL = process.env.BASE_URL || 'http://localhost:8788'

const HEALTH_CHECKS = [
  { name: 'Homepage', method: 'GET', path: '/', expectedStatus: 200 },
  { name: 'API - Comments', method: 'GET', path: '/api/comments?video_id=test', expectedStatus: 200 },
  { name: 'API - Heatmap', method: 'GET', path: '/api/heatmap/test', expectedStatus: [200, 404] },
]

async function runHealthChecks() {
  console.log('🏥 HEALTH CHECK')
  console.log('=' .repeat(80))
  
  let passed = 0, failed = 0
  
  for (const check of HEALTH_CHECKS) {
    process.stdout.write(`Checking ${check.name}... `)
    try {
      const response = await fetch(`${BASE_URL}${check.path}`, { method: check.method })
      const expected = Array.isArray(check.expectedStatus) ? check.expectedStatus : [check.expectedStatus]
      
      if (expected.includes(response.status)) {
        console.log(`✓`)
        passed++
      } else {
        console.log(`✗ (HTTP ${response.status})`)
        failed++
      }
    } catch (error) {
      console.log(`✗ (${error.message})`)
      failed++
    }
  }
  
  console.log('\n' + '=' .repeat(80))
  console.log(`Results: ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

runHealthChecks()
