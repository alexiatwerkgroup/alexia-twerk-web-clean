import { describe, it, expect } from 'vitest'
import { makeUserKey, makeIpKey } from '../../functions/_lib/rate-limit.js'

describe('Rate Limit Helpers', () => {
  describe('makeUserKey', () => {
    it('should create user rate limit key', () => {
      const key = makeUserKey('user_123', 'comments')
      expect(key).toBe('user_user_123:comments')
    })

    it('should handle different actions', () => {
      expect(makeUserKey('u1', 'signup')).toBe('user_u1:signup')
      expect(makeUserKey('u2', 'password_reset')).toBe('user_u2:password_reset')
    })
  })

  describe('makeIpKey', () => {
    it('should create IP rate limit key', () => {
      const key = makeIpKey('192.168.1.1', 'signup')
      expect(key).toBe('ip_192.168.1.1:signup')
    })

    it('should handle IPv6', () => {
      const key = makeIpKey('2001:db8::1', 'api_call')
      expect(key).toBe('ip_2001:db8::1:api_call')
    })
  })
})
