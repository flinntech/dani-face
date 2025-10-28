import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import axios, { AxiosError } from 'axios';
import { ChatRequest, ChatResponse, ErrorResponse } from '../types/agent.types';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { ApiKeysDatabase } from '../services/ApiKeysDatabase';
import { getEncryptionService } from '../services/EncryptionService';
import { Database } from '../services/Database';
import { ConversationLogger } from '../services/ConversationLogger';
import { ConversationLogData } from '../types/conversation-log.types';
import { ConversationService } from '../services/ConversationService';
import { MessageService } from '../services/MessageService';

const router = Router();

// Agent URL from environment variables
const AGENT_URL = process.env.AGENT_URL || 'http://dani-agent:8080/chat';

// Initialize services
const db = Database.getInstance();
const encryption = getEncryptionService();
const apiKeysDb = new ApiKeysDatabase(db, encryption);
const conversationLogger = new ConversationLogger(db);
const conversationService = new ConversationService(db);
const messageService = new MessageService(db);

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
  async (req: AuthRequest, res: Response) => {
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

    let { message, conversationId } = req.body as ChatRequest;
    const userId = req.user!.userId;

    // Capture start time for logging
    const startTime = new Date();

    try {
      // Ensure conversation exists in database (create if needed)
      let conversation = await conversationService.getConversation(conversationId, userId);
      if (!conversation) {
        console.log(`[Chat] Creating new conversation ${conversationId} for user ${userId}`);
        // Auto-generate title from first part of message
        const autoTitle = message.length > 50 ? message.substring(0, 47) + '...' : message;
        conversation = await conversationService.createConversation(userId, autoTitle);
        conversationId = conversation.id; // Use database-generated ID
      }

      console.log(`[Chat] Sending message to agent for conversation ${conversationId}, user ${userId}`);

      // Fetch user's DRM API keys if configured
      let drmApiKeys: { apiKeyId: string; apiKeySecret: string } | undefined;
      try {
        const credentials = await apiKeysDb.getApiKey(userId, 'drm');
        if (credentials) {
          drmApiKeys = {
            apiKeyId: credentials.apiKeyId,
            apiKeySecret: credentials.apiKeySecret,
          };
          console.log(`[Chat] Including DRM API keys for user ${userId}`);
        }
      } catch (error) {
        console.error('[Chat] Error fetching user API keys:', error);
        // Continue without API keys rather than failing the request
      }

      // Forward request to DANI agent
      const response = await axios.post<ChatResponse>(
        AGENT_URL,
        {
          message,
          conversationId,
          userId,
          drmApiKeys,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 120000, // 2 minute timeout for agent response
        }
      );

      console.log(`[Chat] Received response from agent (${response.data.iterations} iterations)`);

      // Save user message to database
      let userMessageId: string | null = null;
      try {
        const userMessage = await messageService.createMessage(conversationId, 'user', message);
        userMessageId = userMessage.id;
        console.log(`[Chat] Saved user message ${userMessageId}`);
      } catch (error) {
        console.error('[Chat] Error saving user message:', error);
        // Continue even if message save fails
      }

      // Save assistant message to database
      let assistantMessageId: string | null = null;
      try {
        const assistantMessage = await messageService.createMessage(
          conversationId,
          'assistant',
          response.data.response,
          {
            usage: response.data.usage,
            model: response.data.model,
            iterations: response.data.iterations,
          }
        );
        assistantMessageId = assistantMessage.id;
        console.log(`[Chat] Saved assistant message ${assistantMessageId}`);
      } catch (error) {
        console.error('[Chat] Error saving assistant message:', error);
        // Continue even if message save fails
      }

      // Log conversation execution flow and get log ID
      const endTime = new Date();
      let logId: string | null = null;
      try {
        logId = await logConversationExecution(
          conversationId,
          userId,
          req.user!.email || 'unknown',
          message,
          response.data,
          startTime,
          endTime,
          assistantMessageId // Pass message ID for reference
        );
      } catch (error) {
        console.error('[Chat] CRITICAL: Failed to log conversation to database:', error);
        console.error('[Chat] Conversation context:', {
          conversationId,
          userId,
          userEmail: req.user!.email || 'unknown',
          messagePreview: message.substring(0, 100),
          timestamp: new Date().toISOString()
        });
        // Don't let logging errors affect the response, but ensure visibility
        // Check /tmp/dani-logs/ for fallback logs if this error persists
      }

      // Return agent response with logId
      res.json({
        ...response.data,
        logId
      });
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
  const fs = require('fs');
  const path = require('path');

  const healthCheck = {
    status: 'healthy' as const,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    agentConnected: false,
    staticFilesExist: false,
    buildPath: '',
  };

  try {
    // Check if static files exist (use absolute path)
    const buildPath = '/app/client/build';
    healthCheck.buildPath = buildPath;
    healthCheck.staticFilesExist = fs.existsSync(buildPath);
  } catch (error) {
    console.warn('[Health] Could not check static files');
  }

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

/**
 * Helper function to log conversation execution
 * Transforms agent response into structured log format
 * Returns the log ID for feedback tracking
 */
async function logConversationExecution(
  conversationId: string,
  userId: string,
  username: string,
  userQuery: string,
  agentResponse: ChatResponse,
  startTime: Date,
  endTime: Date,
  messageId?: string | null
): Promise<string | null> {
  try {
    // Calculate execution time
    const executionTimeMs = endTime.getTime() - startTime.getTime();

    // Transform agent response into log data structure
    const logData: ConversationLogData = {
      username,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      execution_time_ms: executionTimeMs,
      query: {
        original_text: userQuery,
        analyzer_output: {
          selected_model: agentResponse.model || 'unknown',
          complexity_level: 'SIMPLE', // Default, will be populated if available
          reasoning: undefined,
        },
      },
      execution: {
        tool_calls: agentResponse.toolCallDetails?.map((tool) => ({
          tool_name: tool.toolName || '',
          server: tool.server || '',
          input: tool.input || {},
          output: tool.output || {},
          timestamp: tool.timestamp || new Date().toISOString(),
          execution_time_ms: tool.duration || 0,
          iteration: tool.iteration || 0,
          is_error: tool.isError || false,
          error_message: tool.isError ? String(tool.output) : undefined,
        })) || [],
        reasoning_steps: agentResponse.reasoningSteps?.map((step, index) => ({
          iteration: step.iteration || 0,
          timestamp: step.timestamp || new Date().toISOString(),
          tools_requested: step.toolsRequested || [],
          thinking_content: step.thinking,
          step_order: index,
        })) || [],
        iterations: agentResponse.iterations || 1,
      },
      response: {
        final_text: agentResponse.response || '',
        model_used: agentResponse.model || 'unknown',
        usage: {
          input_tokens: agentResponse.usage?.input_tokens || 0,
          output_tokens: agentResponse.usage?.output_tokens || 0,
          cache_creation_tokens: agentResponse.usage?.cache_creation_tokens,
          cache_read_tokens: agentResponse.usage?.cache_read_tokens,
        },
      },
      feedback: {
        status: null, // Will be updated later when feedback feature is implemented
        comment: undefined,
        timestamp: undefined,
      },
      metadata: {
        agent_url: AGENT_URL,
      },
    };

    // Log to database and return log ID
    const logId = await conversationLogger.logConversation(
      conversationId,
      messageId || null, // message_id from saved assistant message
      userId,
      logData
    );
    return logId;
  } catch (error) {
    console.error('[Chat] Failed to log conversation execution:', error);
    throw error;
  }
}

export default router;
