const options = {
  swaggerDefinition: {
    openapi: '3.0.3',
    info: {
      title: 'API Docs.',
      version: '1.0.0',
      description: 'API 문서입니다.',
    },
    servers: [
      {
        url: 'http://127.0.0.1:3000/api',
      },
    ],
  },
  apis: ['./svr.js'],
};
module.exports = options;