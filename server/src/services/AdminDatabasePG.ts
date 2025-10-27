/**
 * Admin Database Service - PostgreSQL Implementation
 * Handles admin operations like user management and audit logging
 */

import { db } from './Database';
import {
  AdminUser,
  AdminActionLog,
  AdminActionType,
  AdminStats,
  UserFilters,
  PaginationParams,
  PaginatedResponse,
  UserRole,
} from '../types/admin.types';

class AdminDatabasePG {
  /**
   * Get all users with filtering, search, and pagination
   */
  async getAllUsers(
    filters?: UserFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<AdminUser>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = ['1=1']; // Always true condition
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.role && filters.role !== 'all') {
      conditions.push(`role = $${paramIndex++}`);
      params.push(filters.role);
    }

    if (filters?.isActive !== undefined) {
      conditions.push(`is_active = $${paramIndex++}`);
      params.push(filters.isActive);
    }

    if (filters?.search) {
      conditions.push(`(LOWER(email) LIKE $${paramIndex} OR LOWER(name) LIKE $${paramIndex})`);
      params.push(`%${filters.search.toLowerCase()}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM users WHERE ${whereClause}`;
    const countResult = await db.queryOne<{ count: string }>(countQuery, params);
    const total = countResult ? parseInt(countResult.count) : 0;

    // Get paginated users
    const dataQuery = `
      SELECT
        id,
        email,
        name,
        role,
        created_at as "createdAt",
        last_login as "lastLogin",
        is_active as "isActive"
      FROM users
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const users = await db.queryMany<AdminUser>(dataQuery, [...params, limit, offset]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all pending users
   */
  async getPendingUsers(): Promise<AdminUser[]> {
    const query = `
      SELECT
        id,
        email,
        name,
        role,
        created_at as "createdAt",
        last_login as "lastLogin",
        is_active as "isActive"
      FROM users
      WHERE role = 'pending' AND is_active = true
      ORDER BY created_at ASC
    `;

    return await db.queryMany<AdminUser>(query);
  }

  /**
   * Get dashboard statistics
   */
  async getUserStats(): Promise<AdminStats> {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE role = 'pending' AND is_active = true) as "pendingUsers",
        COUNT(*) FILTER (WHERE role = 'user' AND is_active = true) as "activeUsers",
        COUNT(*) FILTER (WHERE role = 'admin' AND is_active = true) as "totalAdmins",
        COUNT(*) FILTER (WHERE is_active = true) as "totalUsers",
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days' AND is_active = true) as "recentSignups"
      FROM users
    `;

    const result = await db.queryOne<AdminStats>(query);

    return result || {
      pendingUsers: 0,
      activeUsers: 0,
      totalAdmins: 0,
      totalUsers: 0,
      recentSignups: 0,
    };
  }

  /**
   * Approve a pending user
   */
  async approveUser(userId: string, adminId: string): Promise<AdminUser | null> {
    try {
      await db.beginTransaction();

      // Update user role
      const query = `
        UPDATE users
        SET role = 'user'
        WHERE id = $1 AND role = 'pending'
        RETURNING
          id,
          email,
          name,
          role,
          created_at as "createdAt",
          last_login as "lastLogin",
          is_active as "isActive"
      `;

      const user = await db.queryOne<AdminUser>(query, [userId]);

      if (!user) {
        await db.rollback();
        return null;
      }

      // Log the action
      await this.logAdminAction(adminId, 'approve_user', userId, {
        userEmail: user.email,
      });

      await db.commit();
      return user;
    } catch (error) {
      await db.rollback();
      throw error;
    }
  }

  /**
   * Reject a pending user (delete them)
   */
  async rejectUser(userId: string, adminId: string): Promise<boolean> {
    try {
      await db.beginTransaction();

      // Get user info before deletion
      const user = await db.queryOne<{ email: string }>(
        'SELECT email FROM users WHERE id = $1 AND role = $2',
        [userId, 'pending']
      );

      if (!user) {
        await db.rollback();
        return false;
      }

      // Log the action before deletion
      await this.logAdminAction(adminId, 'reject_user', userId, {
        userEmail: user.email,
      });

      // Delete the user (cascade will handle related data)
      const result = await db.query('DELETE FROM users WHERE id = $1', [userId]);

      await db.commit();
      return (result.rowCount || 0) > 0;
    } catch (error) {
      await db.rollback();
      throw error;
    }
  }

  /**
   * Promote a user to admin
   */
  async promoteToAdmin(userId: string, adminId: string): Promise<AdminUser | null> {
    try {
      await db.beginTransaction();

      const query = `
        UPDATE users
        SET role = 'admin'
        WHERE id = $1 AND role = 'user'
        RETURNING
          id,
          email,
          name,
          role,
          created_at as "createdAt",
          last_login as "lastLogin",
          is_active as "isActive"
      `;

      const user = await db.queryOne<AdminUser>(query, [userId]);

      if (!user) {
        await db.rollback();
        return null;
      }

      await this.logAdminAction(adminId, 'promote_to_admin', userId, {
        userEmail: user.email,
      });

      await db.commit();
      return user;
    } catch (error) {
      await db.rollback();
      throw error;
    }
  }

  /**
   * Demote an admin to regular user
   */
  async demoteFromAdmin(userId: string, adminId: string): Promise<AdminUser | null> {
    try {
      await db.beginTransaction();

      // Check if this is the last admin
      if (await this.isLastAdmin(userId)) {
        await db.rollback();
        throw new Error('Cannot demote the last admin');
      }

      const query = `
        UPDATE users
        SET role = 'user'
        WHERE id = $1 AND role = 'admin'
        RETURNING
          id,
          email,
          name,
          role,
          created_at as "createdAt",
          last_login as "lastLogin",
          is_active as "isActive"
      `;

      const user = await db.queryOne<AdminUser>(query, [userId]);

      if (!user) {
        await db.rollback();
        return null;
      }

      await this.logAdminAction(adminId, 'demote_from_admin', userId, {
        userEmail: user.email,
      });

      await db.commit();
      return user;
    } catch (error) {
      await db.rollback();
      throw error;
    }
  }

  /**
   * Delete a user
   */
  async deleteUser(userId: string, adminId: string): Promise<boolean> {
    try {
      await db.beginTransaction();

      // Get user info before deletion
      const user = await db.queryOne<{ email: string; role: UserRole }>(
        'SELECT email, role FROM users WHERE id = $1',
        [userId]
      );

      if (!user) {
        await db.rollback();
        return false;
      }

      // Prevent deleting the last admin
      if (user.role === 'admin' && (await this.isLastAdmin(userId))) {
        await db.rollback();
        throw new Error('Cannot delete the last admin');
      }

      // Log the action before deletion
      await this.logAdminAction(adminId, 'delete_user', userId, {
        userEmail: user.email,
        userRole: user.role,
      });

      // Delete the user
      const result = await db.query('DELETE FROM users WHERE id = $1', [userId]);

      await db.commit();
      return (result.rowCount || 0) > 0;
    } catch (error) {
      await db.rollback();
      throw error;
    }
  }

  /**
   * Check if a user is the last admin
   */
  async isLastAdmin(userId: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count
      FROM users
      WHERE role = 'admin' AND is_active = true
    `;

    const result = await db.queryOne<{ count: string }>(query);
    const adminCount = result ? parseInt(result.count) : 0;

    if (adminCount <= 1) {
      // Check if the only admin is the specified user
      const user = await db.queryOne<{ role: UserRole }>(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      );
      return user?.role === 'admin';
    }

    return false;
  }

  /**
   * Log an admin action
   */
  async logAdminAction(
    adminId: string,
    actionType: AdminActionType,
    targetUserId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const query = `
      INSERT INTO admin_action_logs (admin_id, action_type, target_user_id, details)
      VALUES ($1, $2, $3, $4)
    `;

    await db.query(query, [adminId, actionType, targetUserId || null, JSON.stringify(details || {})]);
  }

  /**
   * Get admin action logs with filtering and pagination
   */
  async getAdminLogs(
    filters?: {
      adminId?: string;
      actionType?: AdminActionType;
      startDate?: string;
      endDate?: string;
    },
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<AdminActionLog>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.adminId) {
      conditions.push(`l.admin_id = $${paramIndex++}`);
      params.push(filters.adminId);
    }

    if (filters?.actionType) {
      conditions.push(`l.action_type = $${paramIndex++}`);
      params.push(filters.actionType);
    }

    if (filters?.startDate) {
      conditions.push(`l.created_at >= $${paramIndex++}`);
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      conditions.push(`l.created_at <= $${paramIndex++}`);
      params.push(filters.endDate);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM admin_action_logs l WHERE ${whereClause}`;
    const countResult = await db.queryOne<{ count: string }>(countQuery, params);
    const total = countResult ? parseInt(countResult.count) : 0;

    // Get paginated logs
    const dataQuery = `
      SELECT
        l.id,
        l.admin_id as "adminId",
        a.email as "adminEmail",
        l.action_type as "actionType",
        l.target_user_id as "targetUserId",
        t.email as "targetUserEmail",
        l.details,
        l.created_at as "createdAt"
      FROM admin_action_logs l
      LEFT JOIN users a ON l.admin_id = a.id
      LEFT JOIN users t ON l.target_user_id = t.id
      WHERE ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const logs = await db.queryMany<AdminActionLog>(dataQuery, [...params, limit, offset]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a user by ID (admin version with role)
   */
  async getUserById(userId: string): Promise<AdminUser | null> {
    const query = `
      SELECT
        id,
        email,
        name,
        role,
        created_at as "createdAt",
        last_login as "lastLogin",
        is_active as "isActive"
      FROM users
      WHERE id = $1
    `;

    return await db.queryOne<AdminUser>(query, [userId]);
  }
}

// Export singleton instance
export const adminDB = new AdminDatabasePG();
