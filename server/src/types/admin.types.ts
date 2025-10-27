/**
 * Admin System Types
 * Types for admin panel functionality and role-based access control
 */

// User role enum
export type UserRole = 'pending' | 'user' | 'admin';

// Admin action types
export type AdminActionType =
  | 'approve_user'
  | 'reject_user'
  | 'promote_to_admin'
  | 'demote_from_admin'
  | 'delete_user'
  | 'update_user';

// Admin user interface (extends base User with role)
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

// Admin action log entry
export interface AdminActionLog {
  id: string;
  adminId: string;
  adminEmail?: string;
  actionType: AdminActionType;
  targetUserId?: string;
  targetUserEmail?: string;
  details?: Record<string, any>;
  createdAt: string;
}

// Dashboard statistics
export interface AdminStats {
  pendingUsers: number;
  activeUsers: number;
  totalAdmins: number;
  totalUsers: number;
  recentSignups: number; // Last 7 days
}

// User list filters
export interface UserFilters {
  role?: UserRole | 'all';
  search?: string;
  isActive?: boolean;
}

// Pagination parameters
export interface PaginationParams {
  page: number;
  limit: number;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API Request/Response types

export interface GetUsersRequest {
  filters?: UserFilters;
  pagination?: PaginationParams;
}

export interface GetUsersResponse extends PaginatedResponse<AdminUser> {}

export interface GetPendingUsersResponse {
  users: AdminUser[];
  count: number;
}

export interface AdminStatsResponse {
  stats: AdminStats;
}

export interface UserActionResponse {
  success: boolean;
  message: string;
  user?: AdminUser;
}

export interface GetAdminLogsRequest {
  filters?: {
    adminId?: string;
    actionType?: AdminActionType;
    startDate?: string;
    endDate?: string;
  };
  pagination?: PaginationParams;
}

export interface GetAdminLogsResponse extends PaginatedResponse<AdminActionLog> {}

// Error responses
export interface AdminErrorResponse {
  success: false;
  message: string;
  error?: string;
}
