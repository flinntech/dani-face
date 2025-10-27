/**
 * Pending Approval Screen
 * Shown to users whose accounts are awaiting admin approval
 */

import React from 'react';
import '../styles/PendingApproval.css';

interface PendingApprovalProps {
  userEmail?: string;
  onLogout: () => void;
}

export const PendingApproval: React.FC<PendingApprovalProps> = ({ userEmail, onLogout }) => {
  return (
    <div className="pending-approval">
      <div className="pending-approval-container">
        <div className="pending-approval-icon">
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <h1 className="pending-approval-title">Account Pending Approval</h1>

        <div className="pending-approval-message">
          <p>
            Thank you for registering with DANI! Your account is currently awaiting approval from an
            administrator.
          </p>
          <p>
            You'll receive access to the system once an admin has reviewed and approved your account.
            This usually happens within 24 hours.
          </p>
          {userEmail && (
            <p className="pending-approval-email">
              Account: <strong>{userEmail}</strong>
            </p>
          )}
        </div>

        <div className="pending-approval-actions">
          <button className="pending-approval-logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>

        <div className="pending-approval-help">
          <p>
            If you have any questions or need immediate access, please contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
};
