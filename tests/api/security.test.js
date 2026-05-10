import { describe, it, expect } from 'vitest'
import { sanitizeText, clamp } from '../../functions/_lib/validate.js'

describe('Security Functions', () => {
  describe('sanitizeText (XSS prevention)', () => {
    it('should escape HTML special characters', () => {
      const dangerous = '<script>alert("xss")</script>'
      const safe = sanitizeText(dangerous)
      expect(safe).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    })

    it('should escape single quotes', () => {
      const text = "It's a test"
      const safe = sanitizeText(text)
      expect(safe).toBe("It&#039;s a test")
    })

    it('should escape ampersand', () => {
      const text = 'A & B'
      const safe = sanitizeText(text)
      expect(safe).toBe('A &amp; B')
    })

    it('should handle empty string', () => {
      expect(sanitizeText('')).toBe('')
    })

    it('should handle non-string input', () => {
      expect(sanitizeText(null)).toBe('')
      expect(sanitizeText(undefined)).toBe('')
      expect(sanitizeText(123)).toBe('')
    })
  })

  describe('clamp (numeric overflow prevention)', () => {
    it('should clamp value between min and max', () => {
      expect(clamp(5, 0, 10)).toBe(5)
      expect(clamp(-5, 0, 10)).toBe(0)
      expect(clamp(15, 0, 10)).toBe(10)
    })

    it('should handle string numbers', () => {
      expect(clamp('5', 0, 10)).toBe(5)
      expect(clamp('50', 0, 10)).toBe(10)
    })

    it('should work with negative ranges', () => {
      expect(clamp(-5, -10, 0)).toBe(-5)
      expect(clamp(-15, -10, 0)).toBe(-10)
    })
  })
})
