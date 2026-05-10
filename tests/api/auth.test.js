import { describe, it, expect } from 'vitest'
import { ValidationError, validate, validateObject } from '../../functions/_lib/validate.js'

describe('Input Validation', () => {
  describe('Email validation', () => {
    it('should accept valid email', () => {
      expect(validate('test@example.com', 'email')).toBe(true)
    })

    it('should reject invalid email formats', () => {
      expect(() => validate('notanemail', 'email')).toThrow(ValidationError)
      expect(() => validate('test@', 'email')).toThrow(ValidationError)
      expect(() => validate('@example.com', 'email')).toThrow(ValidationError)
    })

    it('should reject email > 200 chars', () => {
      const longEmail = 'a'.repeat(200) + '@example.com'
      expect(() => validate(longEmail, 'email')).toThrow(ValidationError)
    })
  })

  describe('Password validation', () => {
    it('should accept password >= 12 chars', () => {
      expect(validate('test123456789', 'password')).toBe(true)
    })

    it('should reject password < 12 chars', () => {
      expect(() => validate('short', 'password')).toThrow(ValidationError)
    })

    it('should reject password > 256 chars', () => {
      const longPassword = 'a'.repeat(257)
      expect(() => validate(longPassword, 'password')).toThrow(ValidationError)
    })
  })

  describe('Username validation', () => {
    it('should accept valid username', () => {
      expect(validate('valid_user.name-123', 'username')).toBe(true)
    })

    it('should reject username < 3 chars', () => {
      expect(() => validate('ab', 'username')).toThrow(ValidationError)
    })

    it('should reject username with spaces', () => {
      expect(() => validate('invalid user', 'username')).toThrow(ValidationError)
    })

    it('should reject username > 24 chars', () => {
      const longUsername = 'a'.repeat(25)
      expect(() => validate(longUsername, 'username')).toThrow(ValidationError)
    })
  })

  describe('validateObject batch validation', () => {
    it('should validate multiple fields', () => {
      const obj = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123456'
      }
      const rules = {
        email: 'email',
        username: 'username',
        password: 'password'
      }
      const result = validateObject(obj, rules)
      expect(result.email).toBe('test@example.com')
      expect(result.username).toBe('testuser')
    })

    it('should throw ValidationError with field errors', () => {
      const obj = {
        email: 'invalid',
        username: 'ab',
        password: 'short'
      }
      const rules = {
        email: 'email',
        username: 'username',
        password: 'password'
      }
      expect(() => validateObject(obj, rules)).toThrow(ValidationError)
    })

    it('should trim whitespace from strings', () => {
      const obj = {
        username: '  testuser  '
      }
      const rules = { username: 'username' }
      const result = validateObject(obj, rules)
      expect(result.username).toBe('testuser')
    })
  })
})
