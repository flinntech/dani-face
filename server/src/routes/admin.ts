/**
 * Admin API Routes
 * Handles admin panel functionality including user management and audit logs
 */

import { Router, Response } from 'express';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { adminDB } from '../services/AdminDatabasePG';
import { Database } from '../services/Database';
import { ConversationLogger } from '../services/ConversationLogger';
import { LogExportService } from '../services/LogExportService';
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
import {
  LogFilters,
  Pagination,
} from '../types/conversation-log.types';

const router = Router();

// Initialize ConversationLogger
const db = Database.getInstance();
const conversationLogger = new ConversationLogger(db);

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

// ============================================================================
// CONVERSATION LOGS ROUTES
// ============================================================================

/**
 * GET /api/admin/conversation-logs
 * Get conversation logs with filtering and pagination
 */
router.get('/conversation-logs', async (req: AuthRequest, res: Response) => {
  try {
    const filters: LogFilters = {
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
      user_id: req.query.user_id as string,
      model: req.query.model as string,
      feedback_status: req.query.feedback_status as 'positive' | 'negative' | 'none',
      query_text: req.query.query_text as string,
      tool_used: req.query.tool_used as string,
      min_execution_time: req.query.min_execution_time ? parseInt(req.query.min_execution_time as string) : undefined,
      complexity_level: req.query.complexity_level as 'SIMPLE' | 'PROCEDURAL' | 'ANALYTICAL',
    };

    const pagination: Pagination = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
      sort_by: (req.query.sort_by as 'timestamp' | 'execution_time_ms') || 'timestamp',
      sort_order: (req.query.sort_order as 'ASC' | 'DESC') || 'DESC',
    };

    const result = await conversationLogger.queryLogs(filters, pagination);

    // Log admin access (view action)
    await conversationLogger.logAdminAccess(req.user!.userId, 'view_logs', undefined, { filters });

    res.json(result);
  } catch (error) {
    console.error('[Admin] Error fetching conversation logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation logs',
    });
  }
});

/**
 * GET /api/admin/conversation-logs/:logId
 * Get detailed conversation log by ID
 */
router.get('/conversation-logs/:logId', async (req: AuthRequest, res: Response) => {
  try {
    const { logId } = req.params;
    const log = await conversationLogger.getLogDetail(logId);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Conversation log not found',
      });
    }

    // Log admin access (view specific log)
    await conversationLogger.logAdminAccess(req.user!.userId, 'view_log_detail', logId);

    res.json({ log });
  } catch (error) {
    console.error('[Admin] Error fetching conversation log detail:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation log detail',
    });
  }
});

/**
 * GET /api/admin/conversation-logs-stats
 * Get conversation log statistics
 */
router.get('/conversation-logs-stats', async (req: AuthRequest, res: Response) => {
  try {
    const filters: Partial<LogFilters> = {
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
      user_id: req.query.user_id as string,
      model: req.query.model as string,
    };

    const stats = await conversationLogger.getLogStats(filters);
    res.json({ stats });
  } catch (error) {
    console.error('[Admin] Error fetching conversation log stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation log statistics',
    });
  }
});

/**
 * GET /api/admin/conversation-logs/filters/users
 * Get distinct users who have conversation logs
 */
router.get('/conversation-logs/filters/users', async (req: AuthRequest, res: Response) => {
  try {
    const users = await conversationLogger.getDistinctUsers();
    res.json({ users });
  } catch (error) {
    console.error('[Admin] Error fetching distinct users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user list',
    });
  }
});

/**
 * GET /api/admin/conversation-logs/filters/tools
 * Get distinct tools used across all logs
 */
router.get('/conversation-logs/filters/tools', async (req: AuthRequest, res: Response) => {
  try {
    const tools = await conversationLogger.getDistinctTools();
    res.json({ tools });
  } catch (error) {
    console.error('[Admin] Error fetching distinct tools:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tool list',
    });
  }
});

/**
 * POST /api/admin/conversation-logs/export
 * Export conversation logs in various formats
 */
router.post('/conversation-logs/export', async (req: AuthRequest, res: Response) => {
  try {
    const { filters, format, scope } = req.body;

    // Validate format and scope
    const validation = LogExportService.validateExportRequest(format, scope, 0); // Will validate count later
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    // Parse filters
    const logFilters: LogFilters = {
      date_from: filters?.date_from,
      date_to: filters?.date_to,
      user_id: filters?.user_id,
      model: filters?.model,
      feedback_status: filters?.feedback_status,
      query_text: filters?.query_text,
      tool_used: filters?.tool_used,
      min_execution_time: filters?.min_execution_time,
      complexity_level: filters?.complexity_level,
    };

    // Determine pagination based on scope
    let pagination: Pagination;
    if (scope === 'current_page') {
      pagination = {
        page: filters?.page || 1,
        limit: filters?.limit || 50,
        sort_by: 'timestamp',
        sort_order: 'DESC',
      };
    } else {
      // all_filtered - get up to 10,000 records
      pagination = {
        page: 1,
        limit: 10000,
        sort_by: 'timestamp',
        sort_order: 'DESC',
      };
    }

    // Query logs
    const result = await conversationLogger.queryLogs(logFilters, pagination);

    // Validate record count for all_filtered
    if (scope === 'all_filtered' && result.total > 10000) {
      return res.status(400).json({
        success: false,
        message: `Export exceeds maximum record limit (10,000). Total matching records: ${result.total}. Please narrow your filters or date range.`,
      });
    }

    // Create export metadata
    const metadata = LogExportService.createExportMetadata(
      logFilters,
      result.logs.length,
      req.user!.email || req.user!.userId,
      format
    );

    // Generate export data
    let exportData: string;
    switch (format) {
      case 'json':
        exportData = LogExportService.exportToJSON(result.logs, metadata);
        break;
      case 'csv':
        exportData = LogExportService.exportToCSV(result.logs, metadata);
        break;
      case 'jsonl':
        exportData = LogExportService.exportToJSONL(result.logs, metadata);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export format',
        });
    }

    // Generate filename
    const filename = LogExportService.generateFilename(format, logFilters);
    const mimeType = LogExportService.getMimeType(format);

    // Log export action
    LogExportService.logExportAction(req.user!.userId, logFilters, format, result.logs.length);
    await conversationLogger.logAdminAccess(req.user!.userId, 'export_logs', undefined, {
      filters: logFilters,
      export_format: format,
      export_scope: scope,
      record_count: result.logs.length,
    });

    // Send file
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportData);
  } catch (error) {
    console.error('[Admin] Error exporting conversation logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export conversation logs',
    });
  }
});

export default router;
