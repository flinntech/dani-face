/**
 * Admin Panel Component
 * Comprehensive admin interface for user management and system oversight
 */

import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { ConfirmationModal } from './ConfirmationModal';
import {
  AdminUser,
  AdminStats,
  AdminActionLog,
  UserFilters,
  UserRole,
} from '../../types/admin.types';
import '../../styles/Admin.css';

type AdminView = 'dashboard' | 'users' | 'logs';

interface AdminPanelProps {
  onBack: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AdminActionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // User filters
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: 'danger' | 'warning' | 'primary';
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    variant: 'primary',
    onConfirm: async () => {},
  });

  // Load data based on current view
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, roleFilter, searchQuery]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (currentView === 'dashboard') {
        const statsResponse = await adminService.getStats();
        setStats(statsResponse.stats);
        const pendingResponse = await adminService.getPendingUsers();
        setUsers(pendingResponse.users);
      } else if (currentView === 'users') {
        const filters: UserFilters = {
          role: roleFilter,
          search: searchQuery || undefined,
        };
        const response = await adminService.getUsers(filters, { page: 1, limit: 50 });
        setUsers(response.data);
      } else if (currentView === 'logs') {
        const response = await adminService.getAdminLogs({}, { page: 1, limit: 50 });
        setLogs(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleApprove = async (userId: string) => {
    try {
      await adminService.approveUser(userId);
      showSuccess('User approved successfully');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve user');
    }
  };

  const handleReject = (userId: string, userEmail: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Reject User',
      message: `Are you sure you want to reject ${userEmail}? This will permanently delete their account.`,
      confirmText: 'Reject',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await adminService.rejectUser(userId);
          showSuccess('User rejected and removed');
          setConfirmModal({ ...confirmModal, isOpen: false });
          loadData();
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to reject user');
        }
      },
    });
  };

  const handlePromote = (userId: string, userEmail: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Promote to Admin',
      message: `Are you sure you want to promote ${userEmail} to admin? They will have full administrative access.`,
      confirmText: 'Promote',
      variant: 'warning',
      onConfirm: async () => {
        try {
          await adminService.promoteToAdmin(userId);
          showSuccess('User promoted to admin');
          setConfirmModal({ ...confirmModal, isOpen: false });
          loadData();
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to promote user');
        }
      },
    });
  };

  const handleDemote = (userId: string, userEmail: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Demote from Admin',
      message: `Are you sure you want to demote ${userEmail} from admin? They will lose administrative access.`,
      confirmText: 'Demote',
      variant: 'warning',
      onConfirm: async () => {
        try {
          await adminService.demoteFromAdmin(userId);
          showSuccess('Admin demoted to user');
          setConfirmModal({ ...confirmModal, isOpen: false });
          loadData();
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to demote user');
        }
      },
    });
  };

  const handleDelete = (userId: string, userEmail: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete User',
      message: `Are you sure you want to delete ${userEmail}? This action cannot be undone and will remove all their data.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await adminService.deleteUser(userId);
          showSuccess('User deleted successfully');
          setConfirmModal({ ...confirmModal, isOpen: false });
          loadData();
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to delete user');
        }
      },
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'role-badge role-badge-admin';
      case 'user':
        return 'role-badge role-badge-user';
      case 'pending':
        return 'role-badge role-badge-pending';
      default:
        return 'role-badge';
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <button className="btn btn-secondary" onClick={onBack}>
          Back to Chat
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
          <button onClick={() => setSuccess(null)}>&times;</button>
        </div>
      )}

      <div className="admin-nav">
        <button
          className={`admin-nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentView('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`admin-nav-btn ${currentView === 'users' ? 'active' : ''}`}
          onClick={() => setCurrentView('users')}
        >
          User Management
        </button>
        <button
          className={`admin-nav-btn ${currentView === 'logs' ? 'active' : ''}`}
          onClick={() => setCurrentView('logs')}
        >
          Audit Logs
        </button>
      </div>

      <div className="admin-content">
        {loading ? (
          <div className="admin-loading">Loading...</div>
        ) : (
          <>
            {currentView === 'dashboard' && stats && (
              <div className="dashboard">
                <div className="stats-grid">
                  <div className="stat-card stat-card-warning">
                    <div className="stat-value">{stats.pendingUsers}</div>
                    <div className="stat-label">Pending Approvals</div>
                  </div>
                  <div className="stat-card stat-card-success">
                    <div className="stat-value">{stats.activeUsers}</div>
                    <div className="stat-label">Active Users</div>
                  </div>
                  <div className="stat-card stat-card-primary">
                    <div className="stat-value">{stats.totalAdmins}</div>
                    <div className="stat-label">Admins</div>
                  </div>
                  <div className="stat-card stat-card-info">
                    <div className="stat-value">{stats.recentSignups}</div>
                    <div className="stat-label">New (7 days)</div>
                  </div>
                </div>

                {users.length > 0 && (
                  <div className="pending-users-section">
                    <h2>Pending User Approvals</h2>
                    <div className="user-table-container">
                      <table className="user-table">
                        <thead>
                          <tr>
                            <th>Email</th>
                            <th>Name</th>
                            <th>Registered</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((user) => (
                            <tr key={user.id}>
                              <td>{user.email}</td>
                              <td>{user.name}</td>
                              <td>{formatDate(user.createdAt)}</td>
                              <td>
                                <div className="action-buttons">
                                  <button
                                    className="btn btn-success btn-sm"
                                    onClick={() => handleApprove(user.id)}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleReject(user.id, user.email)}
                                  >
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentView === 'users' && (
              <div className="user-management">
                <div className="user-management-header">
                  <div className="filters">
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
                      className="filter-select"
                    >
                      <option value="all">All Users</option>
                      <option value="pending">Pending</option>
                      <option value="user">Users</option>
                      <option value="admin">Admins</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Search by email or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                  </div>
                </div>

                <div className="user-table-container">
                  <table className="user-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Registered</th>
                        <th>Last Login</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.email}</td>
                          <td>{user.name}</td>
                          <td>
                            <span className={getRoleBadgeClass(user.role)}>
                              {user.role}
                            </span>
                          </td>
                          <td>{formatDate(user.createdAt)}</td>
                          <td>{formatDate(user.lastLogin)}</td>
                          <td>
                            <div className="action-buttons">
                              {user.role === 'pending' && (
                                <>
                                  <button
                                    className="btn btn-success btn-sm"
                                    onClick={() => handleApprove(user.id)}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleReject(user.id, user.email)}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {user.role === 'user' && (
                                <>
                                  <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handlePromote(user.id, user.email)}
                                  >
                                    Promote
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleDelete(user.id, user.email)}
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                              {user.role === 'admin' && (
                                <>
                                  <button
                                    className="btn btn-warning btn-sm"
                                    onClick={() => handleDemote(user.id, user.email)}
                                  >
                                    Demote
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleDelete(user.id, user.email)}
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {currentView === 'logs' && (
              <div className="audit-logs">
                <h2>Admin Action Logs</h2>
                <div className="logs-table-container">
                  <table className="logs-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Admin</th>
                        <th>Action</th>
                        <th>Target User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id}>
                          <td>{formatDate(log.createdAt)}</td>
                          <td>{log.adminEmail || 'Unknown'}</td>
                          <td>
                            <span className="action-badge">{log.actionType}</span>
                          </td>
                          <td>{log.targetUserEmail || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmationModal
        {...confirmModal}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
};
