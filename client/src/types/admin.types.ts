/**
 * Admin System Types (Frontend)
 * Types for admin panel functionality
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

// Admin user interface
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
  recentSignups: number;
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

// Pagination info
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

// API Response types

export interface AdminStatsResponse {
  stats: AdminStats;
}

export interface GetUsersResponse extends PaginatedResponse<AdminUser> {}

export interface GetPendingUsersResponse {
  users: AdminUser[];
  count: number;
}

export interface UserActionResponse {
  success: boolean;
  message: string;
  user?: AdminUser;
}

export interface GetAdminLogsResponse extends PaginatedResponse<AdminActionLog> {}

// UI State types

export interface UserTableState {
  filters: UserFilters;
  pagination: PaginationParams;
  sortBy?: 'createdAt' | 'lastLogin' | 'email' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}
