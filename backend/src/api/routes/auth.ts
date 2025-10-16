/**
 * Authentication Routes
 *
 * Handles user registration and login.
 * Created: 2025-10-16
 * Tasks: T091, T092
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../../storage/PostgresAdapter.js';
import { User, CreateUserDTO, UserLoginDTO, toUserResponseDTO } from '../../models/User.js';
import { generateToken } from '../middleware/auth.js';

const router = Router();

const BCRYPT_ROUNDS = 10;

/**
 * POST /auth/register
 *
 * Register a new user account.
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "securepassword"
 * }
 *
 * Response (201):
 * {
 *   "user": { "id": "...", "email": "...", "createdAt": "...", "updatedAt": "..." },
 *   "token": "jwt-token-here"
 * }
 *
 * Errors:
 * - 400: Validation error (missing fields, invalid email format)
 * - 409: Email already exists
 * - 500: Server error
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password }: CreateUserDTO = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Email and password are required',
      });
      return;
    }

    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/.test(email)) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid email format',
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Password must be at least 8 characters long',
      });
      return;
    }

    // Check if email already exists
    const existingUser = await db.query<User>(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      res.status(409).json({
        error: 'Conflict',
        message: 'Email already registered',
      });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user
    const result = await db.query<User>(
      `INSERT INTO users (email, password_hash, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING id, email, created_at, updated_at`,
      [email, passwordHash]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    res.status(201).json({
      user: toUserResponseDTO(user),
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register user',
    });
  }
});

/**
 * POST /auth/login
 *
 * Authenticate user and return JWT token.
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "securepassword"
 * }
 *
 * Response (200):
 * {
 *   "user": { "id": "...", "email": "...", "createdAt": "...", "updatedAt": "..." },
 *   "token": "jwt-token-here"
 * }
 *
 * Errors:
 * - 400: Validation error (missing fields)
 * - 401: Invalid credentials
 * - 500: Server error
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password }: UserLoginDTO = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Email and password are required',
      });
      return;
    }

    // Find user by email
    const result = await db.query<User>(
      'SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      return;
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      return;
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    res.status(200).json({
      user: toUserResponseDTO(user),
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to login',
    });
  }
});

export default router;
