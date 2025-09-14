require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const { ApolloServer } = require('apollo-server-express');
const typeDefs = require('./schema/typeDefs');
const resolvers = require('./resolvers');
const connectDB = require('./config/database');
const swaggerSpecs = require('./config/swagger');

// Import routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const voucherRoutes = require('./routes/vouchers');

const app = express();

// Middleware
app.use(cors({
    origin: [
      'http://localhost:3000',           // frontend dev
      'http://localhost:4000',           // same origin (Playground local)
      'https://studio.apollographql.com' // Apollo Sandbox
    ],
    credentials: true,
    methods: ['GET','POST','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization']
  }));
app.use(express.json());

// Connect to MongoDB
connectDB();

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Express GraphQL Demo API Documentation'
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/vouchers', voucherRoutes);

// Health check endpoint
/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   example: 123.456
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Info endpoint
/**
 * @swagger
 * /api:
 *   get:
 *     summary: API information
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: Express GraphQL Demo API
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 description:
 *                   type: string
 *                   example: A modern Express.js application with GraphQL and Apollo Server
 *                 endpoints:
 *                   type: object
 *                   properties:
 *                     rest:
 *                       type: string
 *                       example: /api/*
 *                     graphql:
 *                       type: string
 *                       example: /graphql
 *                     documentation:
 *                       type: string
 *                       example: /api-docs
 */
app.get('/api', (req, res) => {
  res.json({
    name: 'Express GraphQL Demo API',
    version: '1.0.0',
    description: 'A modern Express.js application with GraphQL and Apollo Server, featuring User, Event, and Voucher management with advanced edit locking system.',
    endpoints: {
      rest: '/api/*',
      graphql: '/graphql',
      documentation: '/api-docs'
    }
  });
});

// Apollo Server setup
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({
    req
  }),
  introspection: true,
  playground: true
});

const startServer = async () => {
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  const PORT = process.env.PORT || 4000;
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 GraphQL Playground available at http://localhost:${PORT}/graphql`);
    console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
    console.log(`🔗 REST API endpoints available at http://localhost:${PORT}/api/*`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer().catch(error => {
  console.error('❌ Error starting server:', error);
  process.exit(1);
});

module.exports = app;
