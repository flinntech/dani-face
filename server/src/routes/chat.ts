import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import axios, { AxiosError } from 'axios';
import { ChatRequest, ChatResponse, ErrorResponse } from '../types/agent.types';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Agent URL from environment variables
const AGENT_URL = process.env.AGENT_URL || 'http://dani-agent:8080/chat';

/**
 * POST /api/chat
 * Proxy chat messages to the DANI agent
 */
router.post(
  '/chat',
  requireAuth, // Require authentication
  [
    // Validation middleware
    body('message')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Message is required')
      .isLength({ max: 10000 })
      .withMessage('Message too long (max 10000 characters)'),
    body('conversationId')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Conversation ID is required')
      .isLength({ max: 100 })
      .withMessage('Conversation ID too long'),
  ],
  async (req: Request, res: Response) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorResponse: ErrorResponse = {
        error: 'Validation Error',
        message: errors.array()[0].msg,
        statusCode: 400,
      };
      return res.status(400).json(errorResponse);
    }

    const { message, conversationId } = req.body as ChatRequest;

    try {
      console.log(`[Chat] Sending message to agent for conversation ${conversationId}`);

      // Forward request to DANI agent
      const response = await axios.post<ChatResponse>(
        AGENT_URL,
        {
          message,
          conversationId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 120000, // 2 minute timeout for agent response
        }
      );

      console.log(`[Chat] Received response from agent (${response.data.iterations} iterations)`);

      // Return agent response
      res.json(response.data);
    } catch (error) {
      console.error('[Chat] Error communicating with agent:', error);

      // Handle different error types
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (axiosError.code === 'ECONNREFUSED') {
          const errorResponse: ErrorResponse = {
            error: 'Agent Unavailable',
            message: 'Unable to connect to DANI agent. Please try again later.',
            statusCode: 503,
          };
          return res.status(503).json(errorResponse);
        }

        if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ECONNABORTED') {
          const errorResponse: ErrorResponse = {
            error: 'Request Timeout',
            message: 'The request took too long to process. Please try again.',
            statusCode: 504,
          };
          return res.status(504).json(errorResponse);
        }

        // Agent returned an error response
        if (axiosError.response) {
          const errorData = axiosError.response.data as { message?: string };
          const errorResponse: ErrorResponse = {
            error: 'Agent Error',
            message: errorData?.message || 'An error occurred while processing your request.',
            statusCode: axiosError.response.status,
          };
          return res.status(axiosError.response.status).json(errorResponse);
        }
      }

      // Generic error
      const errorResponse: ErrorResponse = {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred. Please try again.',
        statusCode: 500,
      };
      res.status(500).json(errorResponse);
    }
  }
);

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  const healthCheck = {
    status: 'healthy' as const,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    agentConnected: false,
  };

  try {
    // Try to ping the agent (with short timeout)
    await axios.get(AGENT_URL.replace('/chat', '/health'), { timeout: 3000 });
    healthCheck.agentConnected = true;
  } catch (error) {
    // Agent not reachable, but our service is still healthy
    console.warn('[Health] Agent not reachable');
  }

  res.json(healthCheck);
});

export default router;
