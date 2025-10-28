import express, { Request, Response } from 'express';
import { ConversationService } from '../services/ConversationService';
import { MessageService } from '../services/MessageService';
import { Database } from '../services/Database';
import { requireAuth } from '../middleware/auth.middleware';

const router = express.Router();

// Initialize services
const db = Database.getInstance();
const conversationService = new ConversationService(db);
const messageService = new MessageService(db);

/**
 * POST /api/conversations
 * Create a new conversation
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { title } = req.body;

    const conversation = await conversationService.createConversation(userId, title);

    res.status(201).json(conversation);
  } catch (error) {
    console.error('[Conversations] Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

/**
 * GET /api/conversations
 * Get all conversations for the authenticated user
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const includeArchived = req.query.includeArchived === 'true';

    const conversations = await conversationService.getUserConversations(
      userId,
      limit,
      offset,
      includeArchived
    );

    const count = await conversationService.getConversationCount(userId, includeArchived);

    res.json({
      conversations,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + conversations.length < count,
      },
    });
  } catch (error) {
    console.error('[Conversations] Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * GET /api/conversations/:id
 * Get a single conversation with all its messages
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const conversation = await conversationService.getConversationWithMessages(id, userId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('[Conversations] Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

/**
 * PATCH /api/conversations/:id
 * Update a conversation (title, archive status)
 */
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { title, is_archived } = req.body;

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (is_archived !== undefined) updates.is_archived = is_archived;

    const conversation = await conversationService.updateConversation(id, userId, updates);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('[Conversations] Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

/**
 * POST /api/conversations/:id/archive
 * Archive a conversation
 */
router.post('/:id/archive', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const success = await conversationService.archiveConversation(id, userId);

    if (!success) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ success: true, message: 'Conversation archived' });
  } catch (error) {
    console.error('[Conversations] Error archiving conversation:', error);
    res.status(500).json({ error: 'Failed to archive conversation' });
  }
});

/**
 * POST /api/conversations/:id/unarchive
 * Unarchive a conversation
 */
router.post('/:id/unarchive', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const success = await conversationService.unarchiveConversation(id, userId);

    if (!success) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ success: true, message: 'Conversation unarchived' });
  } catch (error) {
    console.error('[Conversations] Error unarchiving conversation:', error);
    res.status(500).json({ error: 'Failed to unarchive conversation' });
  }
});

/**
 * DELETE /api/conversations/:id
 * Soft delete a conversation
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const success = await conversationService.deleteConversation(id, userId);

    if (!success) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ success: true, message: 'Conversation deleted' });
  } catch (error) {
    console.error('[Conversations] Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

/**
 * GET /api/conversations/:id/messages
 * Get messages for a specific conversation
 */
router.get('/:id/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

    // Verify user owns this conversation
    const conversation = await conversationService.getConversation(id, userId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await messageService.getConversationMessages(id, limit, offset);

    res.json({ messages });
  } catch (error) {
    console.error('[Conversations] Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;
