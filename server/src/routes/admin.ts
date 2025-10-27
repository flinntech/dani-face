/**
 * Admin API Routes
 * Handles admin panel functionality including user management and audit logs
 */

import { Router, Response } from 'express';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { adminDB } from '../services/AdminDatabasePG';
import {
  AdminStatsResponse,
  GetUsersResponse,
  GetPendingUsersResponse,
  UserActionResponse,
  GetAdminLogsResponse,
  AdminErrorResponse,
  UserFilters,
  PaginationParams,
  AdminActionType,
} from '../types/admin.types';

const router = Router();

// All admin routes require authentication and admin role
router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
router.get('/stats', async (req: AuthRequest, res: Response<AdminStatsResponse | AdminErrorResponse>) => {
  try {
    const stats = await adminDB.getUserStats();
    res.json({ stats });
  } catch (error) {
    console.error('[Admin] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
    });
  }
});

/**
 * GET /api/admin/users
 * Get all users with filtering, search, and pagination
 */
router.get('/users', async (req: AuthRequest, res: Response<GetUsersResponse | AdminErrorResponse>) => {
  try {
    const filters: UserFilters = {
      role: (req.query.role as any) || 'all',
      search: req.query.search as string,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
    };

    const pagination: PaginationParams = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await adminDB.getAllUsers(filters, pagination);
    res.json(result);
  } catch (error) {
    console.error('[Admin] Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
    });
  }
});

/**
 * GET /api/admin/users/pending
 * Get all pending users
 */
router.get('/users/pending', async (req: AuthRequest, res: Response<GetPendingUsersResponse | AdminErrorResponse>) => {
  try {
    const users = await adminDB.getPendingUsers();
    res.json({
      users,
      count: users.length,
    });
  } catch (error) {
    console.error('[Admin] Error fetching pending users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending users',
    });
  }
});

/**
 * POST /api/admin/users/:userId/approve
 * Approve a pending user
 */
router.post('/users/:userId/approve', async (req: AuthRequest, res: Response<UserActionResponse>) => {
  try {
    const { userId } = req.params;
    const adminId = req.user!.userId;

    const user = await adminDB.approveUser(userId, adminId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found or not in pending status',
      });
    }

    res.json({
      success: true,
      message: 'User approved successfully',
      user,
    });
  } catch (error) {
    console.error('[Admin] Error approving user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve user',
    });
  }
});

/**
 * POST /api/admin/users/:userId/reject
 * Reject a pending user (deletes them)
 */
router.post('/users/:userId/reject', async (req: AuthRequest, res: Response<UserActionResponse>) => {
  try {
    const { userId } = req.params;
    const adminId = req.user!.userId;

    const success = await adminDB.rejectUser(userId, adminId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'User not found or not in pending status',
      });
    }

    res.json({
      success: true,
      message: 'User rejected and removed',
    });
  } catch (error) {
    console.error('[Admin] Error rejecting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject user',
    });
  }
});

/**
 * POST /api/admin/users/:userId/promote
 * Promote a user to admin
 */
router.post('/users/:userId/promote', async (req: AuthRequest, res: Response<UserActionResponse>) => {
  try {
    const { userId } = req.params;
    const adminId = req.user!.userId;

    const user = await adminDB.promoteToAdmin(userId, adminId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found or not eligible for promotion',
      });
    }

    res.json({
      success: true,
      message: 'User promoted to admin successfully',
      user,
    });
  } catch (error) {
    console.error('[Admin] Error promoting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to promote user',
    });
  }
});

/**
 * POST /api/admin/users/:userId/demote
 * Demote an admin to regular user
 */
router.post('/users/:userId/demote', async (req: AuthRequest, res: Response<UserActionResponse>) => {
  try {
    const { userId } = req.params;
    const adminId = req.user!.userId;

    // Prevent self-demotion
    if (userId === adminId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot demote yourself. Another admin must perform this action.',
      });
    }

    const user = await adminDB.demoteFromAdmin(userId, adminId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found or not an admin',
      });
    }

    res.json({
      success: true,
      message: 'Admin demoted to user successfully',
      user,
    });
  } catch (error: any) {
    console.error('[Admin] Error demoting user:', error);

    if (error.message === 'Cannot demote the last admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot demote the last admin. Promote another user to admin first.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to demote user',
    });
  }
});

/**
 * DELETE /api/admin/users/:userId
 * Delete a user
 */
router.delete('/users/:userId', async (req: AuthRequest, res: Response<UserActionResponse>) => {
  try {
    const { userId } = req.params;
    const adminId = req.user!.userId;

    // Prevent self-deletion
    if (userId === adminId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    const success = await adminDB.deleteUser(userId, adminId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('[Admin] Error deleting user:', error);

    if (error.message === 'Cannot delete the last admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the last admin. Promote another user to admin first.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
    });
  }
});

/**
 * GET /api/admin/logs
 * Get admin action logs with filtering and pagination
 */
router.get('/logs', async (req: AuthRequest, res: Response<GetAdminLogsResponse | AdminErrorResponse>) => {
  try {
    const filters = {
      adminId: req.query.adminId as string,
      actionType: req.query.actionType as AdminActionType,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    const pagination: PaginationParams = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
    };

    const result = await adminDB.getAdminLogs(filters, pagination);
    res.json(result);
  } catch (error) {
    console.error('[Admin] Error fetching logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin logs',
    });
  }
});

/**
 * GET /api/admin/users/:userId
 * Get a specific user by ID
 */
router.get('/users/:userId', async (req: AuthRequest, res: Response<UserActionResponse | AdminErrorResponse>) => {
  try {
    const { userId } = req.params;
    const user = await adminDB.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'User found',
      user,
    });
  } catch (error) {
    console.error('[Admin] Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
    });
  }
});

export default router;
