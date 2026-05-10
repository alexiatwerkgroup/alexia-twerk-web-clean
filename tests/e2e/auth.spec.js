import { test, expect } from '@playwright/test'

const TEST_EMAIL = `test-${Date.now()}@example.com`
const TEST_PASSWORD = 'SecureTestPassword123'
const TEST_USERNAME = `testuser${Date.now()}`

test.describe('Authentication Flows', () => {
  test('should signup new user successfully', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Sign Up")')

    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.fill('input[name="username"]', TEST_USERNAME)

    await page.click('button:has-text("Create Account")')
    await page.waitForURL(/dashboard|welcome|verify-email/, { timeout: 5000 })

    const userBadge = page.locator('[data-testid="user-badge"]')
    await expect(userBadge).toContainText(TEST_USERNAME)
  })

  test('should signin with valid credentials', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Sign In")')

    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button:has-text("Sign In")')

    await page.waitForURL(/dashboard|home/, { timeout: 5000 })
    const userBadge = page.locator('[data-testid="user-badge"]')
    await expect(userBadge).toBeVisible()
  })

  test('should reject invalid password', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Sign In")')

    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', 'WrongPassword123')
    await page.click('button:has-text("Sign In")')

    const error = page.locator('[role="alert"]')
    await expect(error).toContainText(/invalid|incorrect|wrong/i)
  })

  test('should logout successfully', async ({ page }) => {
    await page.goto('/dashboard')

    await page.click('[data-testid="menu-trigger"]')
    await page.click('button:has-text("Sign Out")')

    await page.waitForURL('/', { timeout: 3000 })

    const cookies = await page.context().cookies()
    const authCookie = cookies.find(c => c.name === 'twerkhub_auth')
    expect(authCookie).toBeUndefined()
  })
})
