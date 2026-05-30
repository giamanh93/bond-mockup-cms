const swaggerJsdoc = require('swagger-jsdoc')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BuildStock API',
      version: '1.0.0',
      description: 'API quản lý vật liệu xây dựng — BuildStock',
    },
    servers: [{ url: '/api', description: 'API Server' }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token OIDC từ Zitadel',
        },
      },
      schemas: {
        Product: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            code: { type: 'string', example: 'VL001' },
            name: { type: 'string', example: 'Xi măng Hà Tiên PCB40' },
            categoryId: { type: 'integer' },
            unit: { type: 'string', example: 'Bao' },
            sellPrice: { type: 'number', example: 95000 },
            costPrice: { type: 'number', example: 82000 },
            stockQty: { type: 'number', example: 500 },
            minStock: { type: 'number', example: 50 },
            isActive: { type: 'boolean' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
        PaginatedMeta: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
}

module.exports = swaggerJsdoc(options)
