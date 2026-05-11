/**
 * Input Validation Schema & Validator
 * Single source of truth for all input validation rules
 * v20260511-v1
 */

const SCHEMAS = {
  // Email: RFC 5322 simplified
  email: (value) => {
    if (typeof value !== 'string') return false;
    if (value.length < 5 || value.length > 200) return false;
    return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value);
  },

  // Username: alphanumeric, dots, dashes, underscores
  username: (value) => {
    if (typeof value !== 'string') return false;
    if (value.length < 3 || value.length > 24) return false;
    return /^[a-z0-9_.-]+$/i.test(value);
  },

  // Password: min 12 chars, max 256
  password: (value) => {
    if (typeof value !== 'string') return false;
    return value.length >= 12 && value.length <= 256;
  },

  // Comment/Text: 1-2000 chars, no nulls
  comment: (value) => {
    if (typeof value !== 'string') return false;
    if (value.length < 1 || value.length > 2000) return false;
    return !value.includes('\0');
  },

  // URL: http, https, or data: URI
  url: (value) => {
    if (typeof value !== 'string') return false;
    return value.startsWith('http://') ||
           value.startsWith('https://') ||
           value.startsWith('data:');
  },

  // Slug: alphanumeric, dashes, underscores
  slug: (value) => {
    if (typeof value !== 'string') return false;
    if (value.length < 3 || value.length > 64) return false;
    return /^[a-z0-9_-]+$/i.test(value);
  },

  // JWT Token: alphanumeric, dot-separated
  jwt: (value) => {
    if (typeof value !== 'string') return false;
    return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
  },

  // Positive integer
  positive_int: (value) => {
    const num = parseInt(value);
    return !isNaN(num) && num > 0 && num < 1000000;
  },

  // Locale code
  locale: (value) => {
    if (typeof value !== 'string') return false;
    return /^[a-z]{2}(-[A-Z]{2})?$/.test(value);
  },

  // Boolean-like values
  boolean: (value) => {
    if (typeof value === 'boolean') return true;
    if (typeof value === 'string') {
      return ['true', 'false', 'yes', 'no', '1', '0'].includes(value.toLowerCase());
    }
    return false;
  },
};

/**
 * Validate a single value against a schema
 * @param {*} value - Value to validate
 * @param {string} schemaName - Name of schema (key in SCHEMAS)
 * @returns {boolean} True if valid
 * @throws {Error} If schema not found
 */
function validate(value, schemaName) {
  if (!(schemaName in SCHEMAS)) {
    throw new Error(`Unknown schema: ${schemaName}`);
  }
  return SCHEMAS[schemaName](value);
}

/**
 * Validate an object against multiple schema rules
 * @param {object} obj - Object to validate
 * @param {object} rules - Map of { fieldName: schemaName }
 * @returns {boolean} True if all fields valid
 * @throws {object} Error with { status, code, errors: { fieldName: errorCode } }
 */
function validateObject(obj, rules) {
  const errors = {};

  for (const [fieldName, schemaName] of Object.entries(rules)) {
    const value = obj[fieldName];

    // Check required
    if (value === undefined || value === null || value === '') {
      errors[fieldName] = `missing_${fieldName}`;
      continue;
    }

    // Validate against schema
    try {
      if (!validate(value, schemaName)) {
        errors[fieldName] = `invalid_${schemaName}`;
      }
    } catch (e) {
      errors[fieldName] = 'unknown_schema';
    }
  }

  // Throw if any errors
  if (Object.keys(errors).length > 0) {
    const err = new Error('Validation failed');
    err.status = 400;
    err.code = 'validation_error';
    err.errors = errors;
    throw err;
  }

  return true;
}

/**
 * Optional field validator
 * @param {*} value - Value to validate (or undefined/null for optional)
 * @param {string} schemaName - Name of schema
 * @returns {boolean} True if valid or undefined/null
 */
function validateOptional(value, schemaName) {
  if (value === undefined || value === null) return true;
  return validate(value, schemaName);
}

/**
 * Sanitize text input (prevent XSS)
 * @param {string} text - Raw text input
 * @returns {string} Sanitized text
 */
function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim();
}

/**
 * Normalize email (lowercase)
 * @param {string} email - Raw email
 * @returns {string} Normalized email
 */
function normalizeEmail(email) {
  return typeof email === 'string' ? email.toLowerCase().trim() : '';
}

module.exports = {
  SCHEMAS,
  validate,
  validateObject,
  validateOptional,
  sanitizeText,
  normalizeEmail,
};
