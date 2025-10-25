/**
 * Simple JSON file-based user database
 * For production, consider migrating to PostgreSQL or MongoDB
 */

import fs from 'fs';
import path from 'path';
import { User, UserResponse } from '../types/auth.types';

const DB_PATH = path.join(__dirname, '../../data/users.json');

export class UserDatabase {
  private users: User[] = [];

  constructor() {
    this.loadUsers();
  }

  /**
   * Load users from JSON file
   */
  private loadUsers(): void {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(DB_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Load users if file exists
      if (fs.existsSync(DB_PATH)) {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        this.users = JSON.parse(data);
      } else {
        // Initialize empty database
        this.saveUsers();
      }
    } catch (error) {
      console.error('Error loading users:', error);
      this.users = [];
    }
  }

  /**
   * Save users to JSON file
   */
  private saveUsers(): void {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.users, null, 2));
    } catch (error) {
      console.error('Error saving users:', error);
      throw new Error('Failed to save user data');
    }
  }

  /**
   * Create a new user
   */
  createUser(user: User): User {
    this.users.push(user);
    this.saveUsers();
    return user;
  }

  /**
   * Find user by email
   */
  findByEmail(email: string): User | undefined {
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  /**
   * Find user by ID
   */
  findById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  /**
   * Update user's last login time
   */
  updateLastLogin(userId: string): void {
    const user = this.findById(userId);
    if (user) {
      user.lastLogin = new Date().toISOString();
      this.saveUsers();
    }
  }

  /**
   * Convert User to UserResponse (remove sensitive data)
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
   * Get all users (for admin purposes)
   */
  getAllUsers(): UserResponse[] {
    return this.users.map(u => this.toUserResponse(u));
  }

  /**
   * Get total user count
   */
  getUserCount(): number {
    return this.users.length;
  }
}

// Singleton instance
export const userDB = new UserDatabase();
