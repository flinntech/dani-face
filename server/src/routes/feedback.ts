import { Router, Request, Response } from 'express';
import { ConversationLogger } from '../services/ConversationLogger';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { Database } from '../services/Database';
import { StructuredLogger } from '../shared/structured-logger';

const router = Router();
const logger = new StructuredLogger('feedback-route');
const db = Database.getInstance();
const conversationLogger = new ConversationLogger(db);

interface SubmitFeedbackRequest {
  logId: string;
  status: 'positive' | 'negative';
  comment?: string;
}

/**
 * POST /api/feedback
 * Submit user feedback for a conversation log
 */
router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { logId, status, comment } = req.body as SubmitFeedbackRequest;

    // Validate required fields
    if (!logId || !status) {
      res.status(400).json({
        error: 'Missing required fields',
        details: 'logId and status are required'
      });
      return;
    }

    // Validate status value
    if (status !== 'positive' && status !== 'negative') {
      res.status(400).json({
        error: 'Invalid status',
        details: 'Status must be either "positive" or "negative"'
      });
      return;
    }

    // Update feedback using existing ConversationLogger method
    await conversationLogger.updateFeedback(logId, status, comment);

    logger.info('Feedback submitted successfully', {
      logId,
      status,
      hasComment: !!comment,
      userId: req.user?.userId
    });

    res.status(200).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        logId,
        status,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error submitting feedback', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body
    });

    res.status(500).json({
      error: 'Failed to submit feedback',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/feedback/:logId
 * Get feedback for a specific conversation log
 */
router.get('/:logId', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { logId } = req.params;

    if (!logId) {
      res.status(400).json({
        error: 'Missing logId parameter'
      });
      return;
    }

    // Query the conversation log to get feedback
    const result = await db.query<{ feedback: any }>(
      `SELECT log_data->'feedback' as feedback
       FROM conversation_logs
       WHERE id = $1`,
      [logId]
    );

    if (!result || result.rows.length === 0) {
      res.status(404).json({
        error: 'Log not found',
        details: `No conversation log found with id: ${logId}`
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        logId,
        feedback: result.rows[0].feedback
      }
    });

  } catch (error) {
    logger.error('Error retrieving feedback', {
      error: error instanceof Error ? error.message : 'Unknown error',
      logId: req.params.logId
    });

    res.status(500).json({
      error: 'Failed to retrieve feedback',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
