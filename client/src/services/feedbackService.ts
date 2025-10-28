/**
 * Feedback Service
 * Handles user feedback submission for DANI responses
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export interface SubmitFeedbackRequest {
  logId: string;
  status: 'positive' | 'negative';
  comment?: string;
}

export interface SubmitFeedbackResponse {
  success: boolean;
  message: string;
  data: {
    logId: string;
    status: 'positive' | 'negative';
    timestamp: string;
  };
}

export interface GetFeedbackResponse {
  success: boolean;
  data: {
    logId: string;
    feedback: {
      status: 'positive' | 'negative' | null;
      comment?: string;
      timestamp?: string;
    };
  };
}

/**
 * Submit user feedback for a conversation log
 */
export async function submitFeedback(
  logId: string,
  status: 'positive' | 'negative',
  comment?: string
): Promise<SubmitFeedbackResponse> {
  const token = localStorage.getItem('dani_auth_token');

  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await axios.post<SubmitFeedbackResponse>(
    `${API_BASE_URL}/api/feedback`,
    {
      logId,
      status,
      comment,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  return response.data;
}

/**
 * Get feedback for a specific conversation log
 */
export async function getFeedback(logId: string): Promise<GetFeedbackResponse> {
  const token = localStorage.getItem('dani_auth_token');

  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await axios.get<GetFeedbackResponse>(
    `${API_BASE_URL}/api/feedback/${logId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  return response.data;
}
