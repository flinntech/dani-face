/**
 * Authentication Service
 * Handles user registration, login, and token management
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { userDB } from './UserDatabasePG';
import { JWTPayload, AuthResponse, SignupRequest, LoginRequest } from '../types/auth.types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token expires in 7 days
const SALT_ROUNDS = 10;

export class AuthService {
  /**
   * Register a new user
   */
  async signup(request: SignupRequest): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await userDB.findByEmail(request.email);
      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists',
        };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(request.email)) {
        return {
          success: false,
          message: 'Invalid email format',
        };
      }

      // Validate password strength
      if (request.password.length < 8) {
        return {
          success: false,
          message: 'Password must be at least 8 characters long',
        };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(request.password, SALT_ROUNDS);

      // Create user
      const user = await userDB.createUser(
        request.email.toLowerCase(),
        passwordHash,
        request.name
      );

      // Generate JWT token
      const token = this.generateToken({
        userId: user.id,
        email: user.email,
      });

      return {
        success: true,
        user: userDB.toUserResponse(user),
        token,
        message: 'User registered successfully',
      };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        message: 'An error occurred during registration',
      };
    }
  }

  /**
   * Login user
   */
  async login(request: LoginRequest): Promise<AuthResponse> {
    try {
      // Find user
      const user = await userDB.findByEmail(request.email);
      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(request.password, user.passwordHash);
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      // Update last login
      await userDB.updateLastLogin(user.id);

      // Generate JWT token
      const token = this.generateToken({
        userId: user.id,
        email: user.email,
      });

      return {
        success: true,
        user: userDB.toUserResponse(user),
        token,
        message: 'Login successful',
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'An error occurred during login',
      };
    }
  }

  /**
   * Generate JWT token
   */
  private generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user by token
   */
  async getUserFromToken(token: string) {
    const payload = this.verifyToken(token);
    if (!payload) {
      return null;
    }

    const user = await userDB.findById(payload.userId);
    if (!user) {
      return null;
    }

    return userDB.toUserResponse(user);
  }
}

export const authService = new AuthService();
