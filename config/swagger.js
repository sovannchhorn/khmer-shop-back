const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'KhmerShop API',
      version: '1.0.0',
      description: 'Full-featured Ecommerce API with KHQR/Bakong Payment',
      contact: { name: 'KhmerShop', email: 'dev@khmershop.com' }
    },
    servers: [{ url: `http://${process.env.SWAGGER_HOST || 'localhost:5000'}/api` }],
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      }
    },
    security: [{ BearerAuth: [] }]
  },
  apis: ['./routes/*.js', './models/*.js']
};

module.exports = swaggerJsdoc(options);
