/**
 * User Database Service - PostgreSQL Implementation
 * Handles user data persistence using PostgreSQL
 */

import { db } from './Database';
import { User, UserResponse } from '../types/auth.types';
import { v4 as uuidv4 } from 'uuid';

class UserDatabasePG {
  /**
   * Create a new user
   */
  async createUser(email: string, passwordHash: string, name: string): Promise<User> {
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    const query = `
      INSERT INTO users (id, email, password_hash, name, created_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, password_hash as "passwordHash", name,
                created_at as "createdAt", last_login as "lastLogin",
                is_active as "isActive"
    `;

    const result = await db.queryOne<User>(query, [id, email, passwordHash, name, createdAt]);

    if (!result) {
      throw new Error('Failed to create user');
    }

    return result;
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash as "passwordHash", name,
             created_at as "createdAt", last_login as "lastLogin",
             is_active as "isActive"
      FROM users
      WHERE email = $1 AND is_active = true
    `;

    return await db.queryOne<User>(query, [email]);
  }

  /**
   * Find a user by ID
   */
  async findById(userId: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash as "passwordHash", name,
             created_at as "createdAt", last_login as "lastLogin",
             is_active as "isActive"
      FROM users
      WHERE id = $1 AND is_active = true
    `;

    return await db.queryOne<User>(query, [userId]);
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    const query = `
      UPDATE users
      SET last_login = $1
      WHERE id = $2
    `;

    await db.query(query, [new Date().toISOString(), userId]);
  }

  /**
   * Get total user count
   */
  async getUserCount(): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM users
      WHERE is_active = true
    `;

    const result = await db.queryOne<{ count: string }>(query);
    return result ? parseInt(result.count) : 0;
  }

  /**
   * Deactivate a user (soft delete)
   */
  async deactivateUser(userId: string): Promise<void> {
    const query = `
      UPDATE users
      SET is_active = false
      WHERE id = $1
    `;

    await db.query(query, [userId]);
  }

  /**
   * Convert User to UserResponse (removes sensitive data)
   */
  toUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: { name?: string; email?: string }): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }

    if (updates.email) {
      fields.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }

    if (fields.length === 0) {
      return await this.findById(userId);
    }

    values.push(userId);

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, password_hash as "passwordHash", name,
                created_at as "createdAt", last_login as "lastLogin",
                is_active as "isActive"
    `;

    return await db.queryOne<User>(query, values);
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(SELECT 1 FROM users WHERE email = $1 AND is_active = true) as exists
    `;

    const result = await db.queryOne<{ exists: boolean }>(query, [email]);
    return result?.exists || false;
  }
}

// Export singleton instance
export const userDB = new UserDatabasePG();
