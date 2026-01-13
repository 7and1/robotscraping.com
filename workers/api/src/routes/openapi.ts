export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'RobotScraping.com API',
    version: '1.0.0',
    description:
      'AI-powered web scraping API with structured data extraction, job scheduling, and webhooks.',
    contact: {
      name: 'RobotScraping.com',
      url: 'https://robotscraping.com',
    },
  },
  servers: [
    { url: 'https://robotscraping.com', description: 'Production' },
    { url: 'http://localhost:8787', description: 'Local Development' },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        description: 'Check if the API is running. No authentication required.',
        tags: ['Health'],
        security: [],
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    service: { type: 'string', example: 'robot-scraping-core' },
                    requestId: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/extract': {
      post: {
        summary: 'Extract structured data from a URL',
        description:
          'Uses AI to extract structured data from any webpage. Provide either a list of fields or a JSON schema.',
        tags: ['Extraction'],
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ExtractRequest' },
              examples: {
                fields: {
                  summary: 'Extract specific fields',
                  value: {
                    url: 'https://example.com/product',
                    fields: ['title', 'price', 'description', 'availability'],
                  },
                },
                schema: {
                  summary: 'Extract using JSON schema',
                  value: {
                    url: 'https://example.com/article',
                    schema: {
                      type: 'object',
                      properties: {
                        headline: { type: 'string' },
                        author: { type: 'string' },
                        publishDate: { type: 'string' },
                        content: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful extraction',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ExtractResponse' },
              },
            },
          },
          '400': {
            description: 'Bad request - invalid input parameters',
            $ref: '#/components/responses/Error',
          },
          '401': {
            description: 'Unauthorized - missing or invalid API key',
            $ref: '#/components/responses/Error',
          },
          '403': { description: 'Blocked by target site', $ref: '#/components/responses/Error' },
          '429': { description: 'Rate limit exceeded', $ref: '#/components/responses/Error' },
          '500': { description: 'Internal server error', $ref: '#/components/responses/Error' },
        },
      },
    },
    '/jobs': {
      get: {
        summary: 'List jobs',
        description: 'Get a list of scraping jobs with optional filtering.',
        tags: ['Jobs'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum number of jobs to return',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: 'status',
            in: 'query',
            description: 'Filter by job status',
            schema: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
          },
        ],
        responses: {
          '200': {
            description: 'List of jobs',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Job' },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/jobs/{id}': {
      get: {
        summary: 'Get job details',
        description: 'Get details and status of a specific job.',
        tags: ['Jobs'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Job ID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Job details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Job' },
                  },
                },
              },
            },
          },
          '404': { description: 'Job not found', $ref: '#/components/responses/Error' },
        },
      },
    },
    '/jobs/{id}/result': {
      get: {
        summary: 'Get job result',
        description: 'Get the result data for a completed job.',
        tags: ['Jobs'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Job ID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Job result data',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
          '404': { description: 'Job or result not found', $ref: '#/components/responses/Error' },
          '409': { description: 'Job is not completed yet', $ref: '#/components/responses/Error' },
        },
      },
    },
    '/schedules': {
      get: {
        summary: 'List schedules',
        description: 'Get a list of scheduled scraping jobs.',
        tags: ['Schedules'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum number of schedules to return',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          },
        ],
        responses: {
          '200': {
            description: 'List of schedules',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Schedule' },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Error' },
        },
      },
      post: {
        summary: 'Create schedule',
        description: 'Create a new scheduled scraping job using cron syntax.',
        tags: ['Schedules'],
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ScheduleCreateRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Schedule created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    schedule_id: { type: 'string', format: 'uuid' },
                    status: { type: 'string', enum: ['active'] },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/schedules/{id}': {
      get: {
        summary: 'Get schedule details',
        description: 'Get details of a specific schedule.',
        tags: ['Schedules'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Schedule ID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Schedule details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Schedule' },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/Error' },
        },
      },
      patch: {
        summary: 'Update schedule',
        description: 'Update an existing schedule.',
        tags: ['Schedules'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Schedule ID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ScheduleUpdateRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Schedule updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/Error' },
          '404': { $ref: '#/components/responses/Error' },
        },
      },
      delete: {
        summary: 'Delete schedule',
        description: 'Delete a schedule.',
        tags: ['Schedules'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Schedule ID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Schedule deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/usage': {
      get: {
        summary: 'Get usage statistics',
        description: 'Get usage statistics and recent logs for the authenticated API key.',
        tags: ['Usage'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'range',
            in: 'query',
            description: 'Time range (e.g., 7d, 24h, 90d)',
            schema: { type: 'string', pattern: '^[0-9]+[hdw]$', default: '7d' },
          },
          {
            name: 'from',
            in: 'query',
            description: 'Start timestamp (milliseconds since epoch)',
            schema: { type: 'integer', format: 'int64' },
          },
          {
            name: 'to',
            in: 'query',
            description: 'End timestamp (milliseconds since epoch)',
            schema: { type: 'integer', format: 'int64' },
          },
        ],
        responses: {
          '200': {
            description: 'Usage statistics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        summary: {
                          type: 'object',
                          properties: {
                            totalRequests: { type: 'integer' },
                            successfulRequests: { type: 'integer' },
                            totalTokens: { type: 'integer' },
                            avgLatencyMs: { type: 'number' },
                          },
                        },
                        series: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              timestamp: { type: 'integer' },
                              requests: { type: 'integer' },
                              tokens: { type: 'integer' },
                            },
                          },
                        },
                        recent: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/UsageLog' },
                        },
                        range: {
                          type: 'object',
                          properties: {
                            from: { type: 'integer' },
                            to: { type: 'integer' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/usage/export': {
      get: {
        summary: 'Export usage as CSV',
        description: 'Export usage logs as a CSV file.',
        tags: ['Usage'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum number of rows to return (1-5000)',
            schema: { type: 'integer', minimum: 1, maximum: 5000, default: 500 },
          },
          {
            name: 'range',
            in: 'query',
            description: 'Time range (e.g., 7d, 24h, 90d)',
            schema: { type: 'string', pattern: '^[0-9]+[hdw]$', default: '7d' },
          },
          {
            name: 'from',
            in: 'query',
            description: 'Start timestamp (milliseconds since epoch)',
            schema: { type: 'integer', format: 'int64' },
          },
          {
            name: 'to',
            in: 'query',
            description: 'End timestamp (milliseconds since epoch)',
            schema: { type: 'integer', format: 'int64' },
          },
        ],
        responses: {
          '200': {
            description: 'CSV file',
            content: {
              'text/csv': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/webhook/test': {
      post: {
        summary: 'Test webhook',
        description: 'Send a test webhook to verify your endpoint is working.',
        tags: ['Webhooks'],
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url'],
                properties: {
                  url: {
                    type: 'string',
                    format: 'uri',
                    description: 'Webhook URL to send test request to',
                  },
                  secret: {
                    type: 'string',
                    minLength: 16,
                    maxLength: 256,
                    description: 'Optional secret for HMAC signature validation',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Test webhook sent',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/Error' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'API key for authentication. Get your key at https://robotscraping.com',
      },
    },
    schemas: {
      ExtractRequest: {
        type: 'object',
        required: ['url'],
        properties: {
          url: {
            type: 'string',
            format: 'uri',
            description: 'URL to scrape',
          },
          fields: {
            type: 'array',
            maxItems: 50,
            items: { type: 'string' },
            description: 'List of field names to extract',
          },
          schema: {
            type: 'object',
            description: 'JSON schema for structured extraction',
          },
          instructions: {
            type: 'string',
            maxLength: 5000,
            description: 'Additional instructions for the AI model',
          },
          async: {
            type: 'boolean',
            default: false,
            description: 'Process asynchronously and return a job ID',
          },
          webhook_url: {
            type: 'string',
            format: 'uri',
            description: 'URL to receive results when async=true',
          },
          webhook_secret: {
            type: 'string',
            minLength: 16,
            maxLength: 256,
            description: 'Secret for HMAC signature on webhook requests',
          },
          format: {
            type: 'string',
            enum: ['json'],
            default: 'json',
            description: 'Response format (currently only JSON is supported)',
          },
          options: {
            type: 'object',
            properties: {
              screenshot: {
                type: 'boolean',
                description: 'Capture a screenshot of the page',
              },
              storeContent: {
                type: 'boolean',
                description: 'Store the raw HTML content',
              },
              waitUntil: {
                type: 'string',
                enum: ['domcontentloaded', 'networkidle0'],
                description: 'When to consider page loading complete',
              },
              timeoutMs: {
                type: 'integer',
                minimum: 1000,
                maximum: 60000,
                description: 'Page load timeout in milliseconds',
              },
            },
          },
        },
      },
      ExtractResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            description: 'Extracted data based on fields or schema',
          },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
          },
          meta: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              latencyMs: { type: 'integer' },
              tokens: { type: 'integer' },
              blocked: { type: 'boolean' },
              contentChars: { type: 'integer' },
              remainingCredits: { type: 'integer', nullable: true },
              cache: {
                type: 'object',
                properties: {
                  hit: { type: 'boolean' },
                  ageMs: { type: 'integer' },
                },
              },
            },
          },
        },
      },
      ScheduleCreateRequest: {
        type: 'object',
        required: ['url', 'cron', 'webhook_url'],
        properties: {
          url: {
            type: 'string',
            format: 'uri',
            description: 'URL to scrape on schedule',
          },
          fields: {
            type: 'array',
            maxItems: 50,
            items: { type: 'string' },
            description: 'List of field names to extract',
          },
          schema: {
            type: 'object',
            description: 'JSON schema for structured extraction',
          },
          instructions: {
            type: 'string',
            maxLength: 5000,
            description: 'Additional instructions for the AI model',
          },
          cron: {
            type: 'string',
            description: 'Cron expression (min hour day month dow)',
            example: '0 */6 * * *',
          },
          webhook_url: {
            type: 'string',
            format: 'uri',
            description: 'URL to receive results',
          },
          webhook_secret: {
            type: 'string',
            minLength: 16,
            maxLength: 256,
            description: 'Secret for HMAC signature on webhook requests',
          },
        },
      },
      ScheduleUpdateRequest: {
        type: 'object',
        properties: {
          is_active: {
            type: 'boolean',
            description: 'Enable or disable the schedule',
          },
          cron: {
            type: 'string',
            description: 'Cron expression (min hour day month dow)',
          },
          webhook_url: {
            type: 'string',
            format: 'uri',
            description: 'URL to receive results',
          },
          webhook_secret: {
            type: 'string',
            minLength: 16,
            maxLength: 256,
            description: 'Secret for HMAC signature on webhook requests',
          },
          fields: {
            type: 'array',
            maxItems: 50,
            items: { type: 'string' },
            description: 'List of field names to extract',
          },
          schema: {
            type: 'object',
            description: 'JSON schema for structured extraction',
          },
          instructions: {
            type: 'string',
            maxLength: 5000,
            description: 'Additional instructions for the AI model',
          },
        },
      },
      Job: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          url: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
          fields_requested: { type: 'string', nullable: true },
          result_url: { type: 'string', nullable: true },
          error_msg: { type: 'string', nullable: true },
          token_usage: { type: 'integer', nullable: true },
          latency_ms: { type: 'integer', nullable: true },
          blocked: { type: 'integer', nullable: true },
          created_at: { type: 'integer', description: 'Unix timestamp in milliseconds' },
          started_at: { type: 'integer', nullable: true },
          completed_at: { type: 'integer', nullable: true },
        },
      },
      Schedule: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          url: { type: 'string' },
          cron: { type: 'string' },
          webhook_url: { type: 'string' },
          is_active: { type: 'integer', description: '0 or 1' },
          next_run_at: { type: 'integer', nullable: true },
          last_run_at: { type: 'integer', nullable: true },
          created_at: { type: 'integer', description: 'Unix timestamp in milliseconds' },
        },
      },
      UsageLog: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          url: { type: 'string' },
          status: { type: 'string' },
          token_usage: { type: 'integer', nullable: true },
          latency_ms: { type: 'integer', nullable: true },
          created_at: { type: 'integer', description: 'Unix timestamp in milliseconds' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    responses: {
      Error: {
        description: 'Error response',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    },
  },
  tags: [
    { name: 'Health', description: 'Health check endpoints' },
    { name: 'Extraction', description: 'Data extraction endpoints' },
    { name: 'Jobs', description: 'Job management endpoints' },
    { name: 'Schedules', description: 'Scheduled scraping endpoints' },
    { name: 'Usage', description: 'Usage statistics endpoints' },
    { name: 'Webhooks', description: 'Webhook testing endpoints' },
  ],
} as const;

export type OpenApiSpec = typeof openApiSpec;
