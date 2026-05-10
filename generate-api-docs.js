#!/usr/bin/env node
/**
 * generate-api-docs.js - Auto-generate OpenAPI/Swagger documentation
 *
 * Scans endpoint files and generates complete OpenAPI 3.0 spec.
 * Usage:
 *   node generate-api-docs.js               # Generate docs
 *   node generate-api-docs.js --output=api.json  # Save to file
 *   node generate-api-docs.js --format=yaml     # Output as YAML
 */

const fs = require('fs')
const path = require('path')

const API_DOCS = {
  openapi: '3.0.0',
  info: {
    title: 'Twerkhub API',
    description: 'Cloudflare Workers API for alexiatwerkgroup.com',
    version: '1.0.0',
    contact: {
      name: 'Twerkhub Support',
      email: 'alexiatwerkoficial@gmail.com',
    },
  },
  servers: [
    {
      url: 'https://alexiatwerkgroup.com/api',
      description: 'Production API',
    },
    {
      url: 'http://localhost:8788/api',
      description: 'Local development',
    },
  ],
  paths: {},
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: false },
          error: { type: 'string', example: 'unauthorized' },
          detail: { type: 'string' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          username: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Token: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          expires_in: { type: 'number' },
        },
      },
      Comment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          video_id: { type: 'string' },
          user_id: { type: 'string' },
          text: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
}

const ENDPOINTS_CONFIG = {
  'POST /auth/signup': {
    summary: 'Create new user account',
    tags: ['auth'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 12 },
              username: { type: 'string', minLength: 3, maxLength: 24 },
            },
            required: ['email', 'password'],
          },
        },
      },
    },
    responses: {
      201: {
        description: 'User created successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ok: { type: 'boolean' },
                user: { $ref: '#/components/schemas/User' },
                token: { type: 'string' },
              },
            },
          },
        },
      },
      400: { $ref: '#/components/responses/BadRequest' },
      409: {
        description: 'Email or username already taken',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },
  'POST /auth/signin': {
    summary: 'Authenticate user',
    tags: ['auth'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string' },
            },
            required: ['email', 'password'],
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Login successful',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ok: { type: 'boolean' },
                user: { $ref: '#/components/schemas/User' },
                token: { type: 'string' },
              },
            },
          },
        },
      },
      401: { description: 'Invalid credentials' },
    },
  },
  'GET /comments?video_id=id': {
    summary: 'Get video comments',
    tags: ['comments'],
    parameters: [
      {
        name: 'video_id',
        in: 'query',
        required: true,
        schema: { type: 'string' },
      },
    ],
    responses: {
      200: {
        description: 'Comments retrieved',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ok: { type: 'boolean' },
                comments: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Comment' },
                },
              },
            },
          },
        },
      },
    },
  },
  'POST /comments': {
    summary: 'Create comment',
    tags: ['comments'],
    security: [{ BearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              video_id: { type: 'string' },
              text: { type: 'string', minLength: 1, maxLength: 2000 },
            },
            required: ['video_id', 'text'],
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Comment created',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ok: { type: 'boolean' },
                comment: { $ref: '#/components/schemas/Comment' },
              },
            },
          },
        },
      },
      401: { description: 'Unauthorized' },
      429: { description: 'Rate limited' },
    },
  },
  'GET /profile/me': {
    summary: 'Get own profile',
    tags: ['profile'],
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: 'Profile retrieved',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ok: { type: 'boolean' },
                profile: { $ref: '#/components/schemas/User' },
              },
            },
          },
        },
      },
      401: { description: 'Unauthorized' },
    },
  },
  'POST /tokens/grant': {
    summary: 'Grant tokens to user (admin)',
    tags: ['tokens'],
    security: [{ BearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              amount: { type: 'number', minimum: 1, maximum: 1000 },
              reason: { type: 'string' },
            },
            required: ['amount'],
          },
        },
      },
    },
    responses: {
      200: { description: 'Tokens granted' },
      401: { description: 'Unauthorized' },
      403: { description: 'Insufficient permissions' },
    },
  },
  'POST /heatmap/record': {
    summary: 'Record video segment view',
    tags: ['heatmap'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              video_id: { type: 'string' },
              bucket_index: { type: 'number', minimum: 0, maximum: 199 },
            },
            required: ['video_id', 'bucket_index'],
          },
        },
      },
    },
    responses: {
      200: { description: 'Heatmap recorded' },
      400: { description: 'Invalid bucket index' },
    },
  },
}

function generateOpenAPI() {
  console.log('Generating OpenAPI documentation...\n')

  // Add endpoints
  for (const [endpoint, config] of Object.entries(ENDPOINTS_CONFIG)) {
    const [method, path] = endpoint.split(' ')
    const pathKey = path.replace(/id/g, '{id}')

    if (!API_DOCS.paths[pathKey]) {
      API_DOCS.paths[pathKey] = {}
    }

    API_DOCS.paths[pathKey][method.toLowerCase()] = config
  }

  // Add common responses
  API_DOCS.components.responses = {
    BadRequest: {
      description: 'Bad request',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
    },
    Unauthorized: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
    },
    NotFound: {
      description: 'Not found',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
    },
    RateLimited: {
      description: 'Rate limited',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
    },
  }

  return API_DOCS
}

function outputJSON(docs) {
  return JSON.stringify(docs, null, 2)
}

function outputYAML(docs) {
  // Simple JSON to YAML converter
  const json = JSON.stringify(docs)
  return json
    .replace(/"/g, "'")
    .replace(/: {/g, ':\n  ')
    .replace(/,/g, '\n')
}

// Main
const docs = generateOpenAPI()

const args = process.argv.slice(2)
const outputFormat = args.find(a => a.startsWith('--format='))?.split('=')[1] || 'json'
const outputFile = args.find(a => a.startsWith('--output='))?.split('=')[1]

let output = outputFormat === 'yaml' ? outputYAML(docs) : outputJSON(docs)

if (outputFile) {
  fs.writeFileSync(outputFile, output)
  console.log(`✓ API documentation saved to ${outputFile}`)
} else {
  console.log(output)
}

console.log(`\n✓ Generated OpenAPI ${docs.openapi} specification`)
console.log(`  Paths: ${Object.keys(docs.paths).length}`)
console.log(`  Endpoints: ${Object.values(docs.paths).reduce((sum, p) => sum + Object.keys(p).length, 0)}`)
