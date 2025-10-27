/**
 * Admin API Service
 * Handles all admin panel API calls
 */

import axios from 'axios';
import { authService } from './authService';
import {
  AdminStatsResponse,
  GetUsersResponse,
  GetPendingUsersResponse,
  UserActionResponse,
  GetAdminLogsResponse,
  UserFilters,
  PaginationParams,
  AdminActionType,
} from '../types/admin.types';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

/**
 * Get auth headers for admin requests
 */
const getAuthHeaders = () => {
  const token = authService.getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  return {
    Authorization: `Bearer ${token}`,
  };
};

class AdminService {
  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<AdminStatsResponse> {
    const response = await axios.get(`${API_BASE}/admin/stats`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  }

  /**
   * Get all users with filtering and pagination
   */
  async getUsers(
    filters?: UserFilters,
    pagination?: PaginationParams
  ): Promise<GetUsersResponse> {
    const params = new URLSearchParams();

    if (filters?.role) {
      params.append('role', filters.role);
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (filters?.isActive !== undefined) {
      params.append('isActive', filters.isActive.toString());
    }
    if (pagination?.page) {
      params.append('page', pagination.page.toString());
    }
    if (pagination?.limit) {
      params.append('limit', pagination.limit.toString());
    }

    const response = await axios.get(`${API_BASE}/admin/users?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  }

  /**
   * Get pending users
   */
  async getPendingUsers(): Promise<GetPendingUsersResponse> {
    const response = await axios.get(`${API_BASE}/admin/users/pending`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  }

  /**
   * Approve a pending user
   */
  async approveUser(userId: string): Promise<UserActionResponse> {
    const response = await axios.post(
      `${API_BASE}/admin/users/${userId}/approve`,
      {},
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  }

  /**
   * Reject a pending user
   */
  async rejectUser(userId: string): Promise<UserActionResponse> {
    const response = await axios.post(
      `${API_BASE}/admin/users/${userId}/reject`,
      {},
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  }

  /**
   * Promote user to admin
   */
  async promoteToAdmin(userId: string): Promise<UserActionResponse> {
    const response = await axios.post(
      `${API_BASE}/admin/users/${userId}/promote`,
      {},
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  }

  /**
   * Demote admin to user
   */
  async demoteFromAdmin(userId: string): Promise<UserActionResponse> {
    const response = await axios.post(
      `${API_BASE}/admin/users/${userId}/demote`,
      {},
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data;
  }

  /**
   * Delete a user
   */
  async deleteUser(userId: string): Promise<UserActionResponse> {
    const response = await axios.delete(`${API_BASE}/admin/users/${userId}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  }

  /**
   * Get admin action logs
   */
  async getAdminLogs(
    filters?: {
      adminId?: string;
      actionType?: AdminActionType;
      startDate?: string;
      endDate?: string;
    },
    pagination?: PaginationParams
  ): Promise<GetAdminLogsResponse> {
    const params = new URLSearchParams();

    if (filters?.adminId) {
      params.append('adminId', filters.adminId);
    }
    if (filters?.actionType) {
      params.append('actionType', filters.actionType);
    }
    if (filters?.startDate) {
      params.append('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params.append('endDate', filters.endDate);
    }
    if (pagination?.page) {
      params.append('page', pagination.page.toString());
    }
    if (pagination?.limit) {
      params.append('limit', pagination.limit.toString());
    }

    const response = await axios.get(`${API_BASE}/admin/logs?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  }

  /**
   * Get a specific user by ID
   */
  async getUserById(userId: string): Promise<UserActionResponse> {
    const response = await axios.get(`${API_BASE}/admin/users/${userId}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  }
}

export const adminService = new AdminService();
