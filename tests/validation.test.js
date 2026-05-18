import { describe, it, expect } from 'vitest';
import {
  validate,
  validateObject,
  validateOptional,
  sanitizeText,
  normalizeEmail,
} from '../functions/_lib/validate.js';

describe('Validation Schemas', () => {
  describe('email schema', () => {
    it('should accept valid emails', () => {
      expect(validate('user@example.com', 'email')).toBe(true);
      expect(validate('test.user+tag@sub.domain.org', 'email')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validate('invalid', 'email')).toBe(false);
      expect(validate('user@', 'email')).toBe(false);
      expect(validate('@example.com', 'email')).toBe(false);
      expect(validate('', 'email')).toBe(false);
    });

    it('should enforce length limits', () => {
      const tooLong = 'a'.repeat(201) + '@example.com';
      expect(validate(tooLong, 'email')).toBe(false);
    });

    it('should reject non-strings', () => {
      expect(validate(123, 'email')).toBe(false);
      expect(validate(null, 'email')).toBe(false);
      expect(validate(undefined, 'email')).toBe(false);
    });
  });

  describe('password schema', () => {
    it('should accept valid passwords', () => {
      expect(validate('MyPassword1!@', 'password')).toBe(true);
      expect(validate('a'.repeat(12), 'password')).toBe(true);
    });

    it('should enforce min length 12', () => {
      expect(validate('Short1!', 'password')).toBe(false);
      expect(validate('11chars!!1!', 'password')).toBe(false);
    });

    it('should enforce max length 256', () => {
      expect(validate('a'.repeat(257), 'password')).toBe(false);
    });
  });

  describe('username schema', () => {
    it('should accept valid usernames', () => {
      expect(validate('john_doe', 'username')).toBe(true);
      expect(validate('user-123', 'username')).toBe(true);
      expect(validate('Test.User', 'username')).toBe(true);
    });

    it('should reject invalid usernames', () => {
      expect(validate('ab', 'username')).toBe(false); // Too short
      expect(validate('a'.repeat(25), 'username')).toBe(false); // Too long
      expect(validate('user@name', 'username')).toBe(false); // Special char
      expect(validate('user name', 'username')).toBe(false); // Space
    });
  });

  describe('comment schema', () => {
    it('should accept valid comments', () => {
      expect(validate('Great video!', 'comment')).toBe(true);
      expect(validate('a'.repeat(2000), 'comment')).toBe(true);
    });

    it('should reject empty comments', () => {
      expect(validate('', 'comment')).toBe(false);
    });

    it('should enforce max length 2000', () => {
      expect(validate('a'.repeat(2001), 'comment')).toBe(false);
    });

    it('should reject null bytes', () => {
      expect(validate('test\x00bad', 'comment')).toBe(false);
    });
  });

  describe('url schema', () => {
    it('should accept http/https URLs', () => {
      expect(validate('https://example.com', 'url')).toBe(true);
      expect(validate('http://example.com', 'url')).toBe(true);
    });

    it('should accept data URIs', () => {
      expect(validate('data:image/png;base64,iVBOR...', 'url')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validate('example.com', 'url')).toBe(false);
      expect(validate('ftp://example.com', 'url')).toBe(false);
      expect(validate('/local/path', 'url')).toBe(false);
    });
  });

  describe('slug schema', () => {
    it('should accept valid slugs', () => {
      expect(validate('my-playlist', 'slug')).toBe(true);
      expect(validate('playlist_2026', 'slug')).toBe(true);
      expect(validate('a-b-c', 'slug')).toBe(true);
    });

    it('should reject invalid slugs', () => {
      expect(validate('ab', 'slug')).toBe(false); // Too short
      expect(validate('my playlist', 'slug')).toBe(false); // Space
      expect(validate('my.playlist', 'slug')).toBe(false); // Dot
    });
  });

  describe('jwt schema', () => {
    it('should accept valid JWT tokens', () => {
      expect(validate('eyJhbGc.eyJzdWI.SflKxw', 'jwt')).toBe(true);
    });

    it('should reject invalid JWT tokens', () => {
      expect(validate('invalid', 'jwt')).toBe(false);
      expect(validate('only.two', 'jwt')).toBe(false);
      expect(validate('has four.parts.here.now', 'jwt')).toBe(false);
    });
  });

  describe('positive_int schema', () => {
    it('should accept positive integers', () => {
      expect(validate('1', 'positive_int')).toBe(true);
      expect(validate('999999', 'positive_int')).toBe(true);
    });

    it('should reject zero and negative', () => {
      expect(validate('0', 'positive_int')).toBe(false);
      expect(validate('-1', 'positive_int')).toBe(false);
    });

    it('should enforce max 999999', () => {
      expect(validate('1000000', 'positive_int')).toBe(false);
    });
  });

  describe('locale schema', () => {
    it('should accept valid locales', () => {
      expect(validate('en', 'locale')).toBe(true);
      expect(validate('ru', 'locale')).toBe(true);
      expect(validate('en-US', 'locale')).toBe(true);
    });

    it('should reject invalid locales', () => {
      expect(validate('invalid', 'locale')).toBe(false);
      expect(validate('e', 'locale')).toBe(false);
      expect(validate('en-us', 'locale')).toBe(false); // Must be uppercase region
    });
  });

  describe('boolean schema', () => {
    it('should accept boolean values', () => {
      expect(validate(true, 'boolean')).toBe(true);
      expect(validate(false, 'boolean')).toBe(true);
    });

    it('should accept string boolean values', () => {
      expect(validate('true', 'boolean')).toBe(true);
      expect(validate('false', 'boolean')).toBe(true);
      expect(validate('yes', 'boolean')).toBe(true);
      expect(validate('no', 'boolean')).toBe(true);
      expect(validate('1', 'boolean')).toBe(true);
      expect(validate('0', 'boolean')).toBe(true);
    });

    it('should reject invalid boolean values', () => {
      expect(validate('maybe', 'boolean')).toBe(false);
      expect(validate('2', 'boolean')).toBe(false);
    });
  });
});

describe('validateObject', () => {
  it('should validate multiple fields', () => {
    expect(() => {
      validateObject(
        { email: 'user@example.com', password: 'MyPassword1!@' },
        { email: 'email', password: 'password' }
      );
    }).not.toThrow();
  });

  it('should throw on validation error', () => {
    expect(() => {
      validateObject(
        { email: 'invalid', password: 'MyPassword1!@' },
        { email: 'email', password: 'password' }
      );
    }).toThrow();
  });

  it('should include error details', () => {
    try {
      validateObject(
        { email: 'invalid', password: 'short' },
        { email: 'email', password: 'password' }
      );
    } catch (err) {
      expect(err.code).toBe('validation_error');
      expect(err.errors.email).toBe('invalid_email');
      expect(err.errors.password).toBe('invalid_password');
      expect(err.status).toBe(400);
    }
  });

  it('should reject missing required fields', () => {
    expect(() => {
      validateObject(
        { email: 'user@example.com' },
        { email: 'email', password: 'password' }
      );
    }).toThrow();
  });
});

describe('validateOptional', () => {
  it('should accept undefined for optional fields', () => {
    expect(validateOptional(undefined, 'email')).toBe(true);
    expect(validateOptional(null, 'email')).toBe(true);
  });

  it('should validate non-undefined values', () => {
    expect(validateOptional('user@example.com', 'email')).toBe(true);
    expect(validateOptional('invalid', 'email')).toBe(false);
  });
});

describe('sanitizeText', () => {
  it('should escape HTML entities', () => {
    expect(sanitizeText('<script>alert("xss")</script>'))
      .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('should escape ampersand', () => {
    expect(sanitizeText('A & B')).toBe('A &amp; B');
  });

  it('should trim whitespace', () => {
    expect(sanitizeText('  text  ')).toBe('text');
  });

  it('should handle single quotes', () => {
    expect(sanitizeText("It's ok")).toBe('It&#39;s ok');
  });

  it('should handle non-strings', () => {
    expect(sanitizeText(123)).toBe('');
    expect(sanitizeText(null)).toBe('');
  });
});

describe('normalizeEmail', () => {
  it('should lowercase email', () => {
    expect(normalizeEmail('USER@EXAMPLE.COM')).toBe('user@example.com');
  });

  it('should trim whitespace', () => {
    expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com');
  });

  it('should handle non-strings', () => {
    expect(normalizeEmail(123)).toBe('');
    expect(normalizeEmail(null)).toBe('');
  });
});
