import { Request, Response, NextFunction } from 'express';

/**
 * Custom error class for API errors (T110).
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized error handling middleware (T110).
 *
 * Catches all errors thrown in routes and returns consistent error responses.
 * Handles both operational errors (expected) and programming errors (unexpected).
 *
 * Usage:
 * ```typescript
 * // In routes, throw ApiError for expected errors:
 * throw new ApiError(404, 'Task not found');
 *
 * // Or use next(error) for any error:
 * try {
 *   await someOperation();
 * } catch (error) {
 *   next(error);
 * }
 * ```
 */
export function errorHandler(
  error: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error for debugging
  console.error('Error:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Check if it's an operational error
  if (error instanceof ApiError) {
    // Operational error - send detailed response
    res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        statusCode: error.statusCode,
      },
    });
    return;
  }

  // Handle specific error types
  if (error.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: error.message,
        statusCode: 400,
      },
    });
    return;
  }

  if (error.name === 'UnauthorizedError') {
    res.status(401).json({
      success: false,
      error: {
        message: 'Unauthorized',
        statusCode: 401,
      },
    });
    return;
  }

  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token',
        statusCode: 401,
      },
    });
    return;
  }

  // Programming error - don't leak details to client
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      statusCode: 500,
      // Include stack trace only in development
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
        details: error.message,
      }),
    },
  });
}

/**
 * 404 Not Found handler - for routes that don't exist.
 *
 * Should be registered AFTER all route handlers.
 */
export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const error = new ApiError(404, `Route ${req.originalUrl} not found`);
  next(error);
}

/**
 * Async route handler wrapper to catch promise rejections.
 *
 * Wraps async route handlers to automatically catch errors and pass to error middleware.
 *
 * Usage:
 * ```typescript
 * router.get('/tasks', asyncHandler(async (req, res) => {
 *   const tasks = await taskService.getTasks();
 *   res.json(tasks);
 * }));
 * ```
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
