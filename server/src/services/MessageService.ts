import { Database } from './Database';

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: Date;
  metadata: any;
  deleted_at: Date | null;
}

export class MessageService {
  constructor(private db: Database) {}

  /**
   * Create a new message in a conversation
   */
  async createMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: any
  ): Promise<Message> {
    const result = await this.db.queryOne<Message>(
      `INSERT INTO messages (conversation_id, role, content, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING id, conversation_id, role, content, created_at, metadata, deleted_at`,
      [conversationId, role, content, metadata ? JSON.stringify(metadata) : null]
    );

    if (!result) {
      throw new Error('Failed to create message');
    }

    return result;
  }

  /**
   * Get a single message by ID
   */
  async getMessage(id: string): Promise<Message | null> {
    return await this.db.queryOne<Message>(
      `SELECT id, conversation_id, role, content, created_at, metadata, deleted_at
       FROM messages
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
  }

  /**
   * Get all messages in a conversation
   */
  async getConversationMessages(
    conversationId: string,
    limit?: number,
    offset?: number
  ): Promise<Message[]> {
    const limitClause = limit ? `LIMIT $2` : '';
    const offsetClause = offset ? `OFFSET $3` : '';
    const params = [conversationId];

    if (limit) params.push(limit);
    if (offset) params.push(offset);

    return await this.db.queryMany<Message>(
      `SELECT id, conversation_id, role, content, created_at, metadata, deleted_at
       FROM messages
       WHERE conversation_id = $1 AND deleted_at IS NULL
       ORDER BY created_at ASC
       ${limitClause} ${offsetClause}`,
      params
    );
  }

  /**
   * Get the latest message in a conversation
   */
  async getLatestMessage(conversationId: string): Promise<Message | null> {
    return await this.db.queryOne<Message>(
      `SELECT id, conversation_id, role, content, created_at, metadata, deleted_at
       FROM messages
       WHERE conversation_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [conversationId]
    );
  }

  /**
   * Get message count for a conversation
   */
  async getMessageCount(conversationId: string): Promise<number> {
    const result = await this.db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM messages
       WHERE conversation_id = $1 AND deleted_at IS NULL`,
      [conversationId]
    );

    return result ? parseInt(result.count, 10) : 0;
  }

  /**
   * Update message metadata (e.g., add usage stats, model info)
   */
  async updateMessageMetadata(id: string, metadata: any): Promise<Message | null> {
    return await this.db.queryOne<Message>(
      `UPDATE messages
       SET metadata = $2
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, conversation_id, role, content, created_at, metadata, deleted_at`,
      [id, JSON.stringify(metadata)]
    );
  }

  /**
   * Soft delete a message
   */
  async deleteMessage(id: string): Promise<boolean> {
    const result = await this.db.queryOne<{ id: string }>(
      `UPDATE messages
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [id]
    );

    return result !== null;
  }

  /**
   * Permanently delete a message (use with caution)
   */
  async hardDeleteMessage(id: string): Promise<boolean> {
    const result = await this.db.queryOne<{ id: string }>(
      `DELETE FROM messages
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    return result !== null;
  }

  /**
   * Delete all messages in a conversation
   */
  async deleteConversationMessages(conversationId: string): Promise<number> {
    const result = await this.db.queryOne<{ count: string }>(
      `UPDATE messages
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE conversation_id = $1 AND deleted_at IS NULL
       RETURNING COUNT(*) as count`,
      [conversationId]
    );

    return result ? parseInt(result.count, 10) : 0;
  }
}
