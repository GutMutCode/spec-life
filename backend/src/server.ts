/**
 * Express Server
 *
 * Main server entry point for the Task Priority Manager API.
 * Created: 2025-10-16
 * Task: T087 (Backend Setup)
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { db } from './storage/PostgresAdapter.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(helmet()); // Security headers
app.use(cors({ origin: CORS_ORIGIN, credentials: true })); // CORS
app.use(express.json()); // JSON body parser
app.use(express.urlencoded({ extended: true })); // URL-encoded body parser

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const method = req.method;
  const path = req.path;
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${method} ${path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/health', async (_req, res) => {
  const dbHealthy = await db.healthCheck();

  if (dbHealthy) {
    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// API root
app.get('/', (_req, res) => {
  res.json({
    name: 'Task Priority Manager API',
    version: '0.1.0',
    endpoints: {
      health: '/health',
      auth: {
        register: 'POST /auth/register',
        login: 'POST /auth/login',
      },
      tasks: {
        list: 'GET /tasks',
        create: 'POST /tasks',
        update: 'PUT /tasks/:id',
        delete: 'DELETE /tasks/:id',
      },
    },
  });
});

// Mount route handlers
import authRoutes from './api/routes/auth.js';
import taskRoutes from './api/routes/tasks.js';

app.use('/auth', authRoutes);
app.use('/tasks', taskRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: err.name || 'Error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
async function startServer() {
  try {
    // Initialize database connection
    db.connect();

    // Test database connection
    const healthy = await db.healthCheck();
    if (!healthy) {
      console.warn('Warning: Database connection failed. Server starting anyway.');
    }

    // Start listening
    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ CORS origin: ${CORS_ORIGIN}`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await db.close();
  process.exit(0);
});

startServer();
