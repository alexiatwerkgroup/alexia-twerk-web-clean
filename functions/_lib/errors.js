/**
 * Standardized error responses for API
 * Ensures consistent error format across all endpoints
 */

export class APIError extends Error {
  constructor(code, detail, status = 400) {
    super(detail)
    this.code = code
    this.detail = detail
    this.status = status
  }

  toJSON() {
    return {
      ok: false,
      error: this.code,
      detail: this.detail,
    }
  }
}

// Common API errors
export const Errors = {
  // Auth errors
  INVALID_CREDENTIALS: new APIError('invalid_credentials', 'Email or password is incorrect', 401),
  EMAIL_TAKEN: new APIError('email_taken', 'Email already registered', 409),
  USERNAME_TAKEN: new APIError('username_taken', 'Username is taken', 409),
  INVALID_EMAIL: new APIError('invalid_email', 'Invalid email format', 400),
  INVALID_PASSWORD: new APIError('invalid_password', 'Password must be 12-256 characters', 400),
  INVALID_USERNAME: new APIError('invalid_username', 'Username must be 3-24 alphanumeric characters', 400),

  // Validation errors
  VALIDATION_FAILED: new APIError('validation_failed', 'Validation failed', 400),
  INVALID_INPUT: new APIError('invalid_input', 'Invalid input', 400),
  MISSING_FIELD: (field) => new APIError('missing_field', `Missing required field: ${field}`, 400),

  // Rate limiting
  RATE_LIMITED: new APIError('rate_limited', 'Too many requests. Try again later', 429),

  // Permission errors
  UNAUTHORIZED: new APIError('unauthorized', 'Authentication required', 401),
  FORBIDDEN: new APIError('forbidden', 'Permission denied', 403),
  NOT_FOUND: new APIError('not_found', 'Resource not found', 404),

  // Server errors
  D1_BINDING_MISSING: new APIError('d1_binding_missing', 'Database not configured', 500),
  JWT_SECRET_MISSING: new APIError('jwt_secret_missing', 'JWT secret not configured', 500),
  INTERNAL_ERROR: new APIError('internal_error', 'Internal server error', 500),
  BAD_JSON: new APIError('bad_json', 'Invalid JSON in request body', 400),
  METHOD_NOT_ALLOWED: new APIError('method_not_allowed', 'HTTP method not allowed', 405),
}

/**
 * Create a standardized error response
 * @param {APIError} error - Error instance
 * @param {string} origin - CORS origin
 * @returns {[string, number, string]} [body, status, corsOrigin]
 */
export function errorResponse(error, origin = '') {
  const body = JSON.stringify(error.toJSON())
  return [body, error.status, origin]
}
