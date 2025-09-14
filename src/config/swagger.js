const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Express GraphQL Demo API',
      version: '1.0.0',
      description: 'A modern Express.js application with GraphQL and Apollo Server, featuring User, Event, and Voucher management with advanced edit locking system.',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Development server'
      },
      {
        url: 'https://api.example.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            id: {
              type: 'string',
              description: 'User ID',
              example: '507f1f77bcf86cd799439011'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@example.com'
            },
            name: {
              type: 'string',
              description: 'User full name',
              example: 'John Doe'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              description: 'User role',
              example: 'user'
            },
            isActive: {
              type: 'boolean',
              description: 'User active status',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp'
            }
          }
        },
        Event: {
          type: 'object',
          required: ['name', 'maxQuantity'],
          properties: {
            id: {
              type: 'string',
              description: 'Event ID',
              example: '507f1f77bcf86cd799439011'
            },
            name: {
              type: 'string',
              description: 'Event name',
              example: 'Tech Conference 2024'
            },
            description: {
              type: 'string',
              description: 'Event description',
              example: 'Annual technology conference'
            },
            maxQuantity: {
              type: 'integer',
              minimum: 1,
              description: 'Maximum number of vouchers that can be issued',
              example: 100
            },
            issuedCount: {
              type: 'integer',
              minimum: 0,
              description: 'Number of vouchers already issued',
              example: 25
            },
            availableQuantity: {
              type: 'integer',
              description: 'Available vouchers (computed field)',
              example: 75
            },
            isFullyIssued: {
              type: 'boolean',
              description: 'Whether all vouchers have been issued (computed field)',
              example: false
            },
            isActive: {
              type: 'boolean',
              description: 'Event active status',
              example: true
            },
            editingBy: {
              type: 'string',
              nullable: true,
              description: 'User ID currently editing the event',
              example: '507f1f77bcf86cd799439011'
            },
            editLockAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Edit lock expiration timestamp'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Event creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Event last update timestamp'
            }
          }
        },
        Voucher: {
          type: 'object',
          required: ['eventId', 'code', 'issuedTo'],
          properties: {
            id: {
              type: 'string',
              description: 'Voucher ID',
              example: '507f1f77bcf86cd799439011'
            },
            eventId: {
              type: 'string',
              description: 'Associated event ID',
              example: '507f1f77bcf86cd799439011'
            },
            code: {
              type: 'string',
              description: 'Unique voucher code',
              example: 'VOUCHER-1703123456789-ABC123DEF'
            },
            issuedTo: {
              type: 'string',
              description: 'User email or identifier who received the voucher',
              example: 'user@example.com'
            },
            isUsed: {
              type: 'boolean',
              description: 'Whether the voucher has been used',
              example: false
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Voucher creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Voucher last update timestamp'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'JWT authentication token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Error message',
              example: 'Authentication required'
            },
            code: {
              type: 'string',
              description: 'Error code',
              example: 'AUTH_REQUIRED'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/server.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;
