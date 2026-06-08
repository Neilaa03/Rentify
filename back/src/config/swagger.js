import swaggerJsdoc from 'swagger-jsdoc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Use the public backend URL by default so Swagger points to the deployed API.
// Override with API_BASE_URL when you want to test against another backend.
const apiServerUrl = process.env.API_BASE_URL || 'https://rentify-yj6i.onrender.com';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const routesGlob = path.join(__dirname, '../modules/**/*.js');

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Car Rental API",
      version: "1.0.0",
      description: "Swagger documentation for the Rentify backend API.",
    },
    servers: [
      {
        url: apiServerUrl,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [routesGlob]
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
