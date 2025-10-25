/**
 * Authentication Routes
 * Handles user signup, login, and profile
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from '../services/AuthService';
import { requireAuth } from '../middleware/auth.middleware';
import { userDB } from '../services/UserDatabasePG';
import { SignupRequest, LoginRequest } from '../types/auth.types';

const router = Router();

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post(
  '/signup',
  [
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const signupRequest: SignupRequest = {
        email: req.body.email,
        password: req.body.password,
        name: req.body.name,
      };

      const result = await authService.signup(signupRequest);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      console.error('Signup error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const loginRequest: LoginRequest = {
        email: req.body.email,
        password: req.body.password,
      };

      const result = await authService.login(loginRequest);

      if (!result.success) {
        return res.status(401).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await userDB.findById(req.user!.userId);
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    return res.json({
      success: true,
      user: userDB.toUserResponse(user),
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred',
    });
  }
});

/**
 * POST /api/auth/verify
 * Verify JWT token
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({
        valid: false,
        message: 'Token is required',
      });
    }

    const user = await authService.getUserFromToken(token);
    if (!user) {
      return res.status(401).json({
        valid: false,
        message: 'Invalid or expired token',
      });
    }

    return res.json({
      valid: true,
      user,
    });
  } catch (error) {
    console.error('Verify token error:', error);
    return res.status(500).json({
      valid: false,
      message: 'An error occurred',
    });
  }
});

/**
 * GET /api/auth/stats
 * Get authentication statistics (public)
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const totalUsers = await userDB.getUserCount();
    return res.json({
      totalUsers,
      registrationEnabled: true,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred',
    });
  }
});

export default router;
