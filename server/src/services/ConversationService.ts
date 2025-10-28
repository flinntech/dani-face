import { Database } from './Database';

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: Date;
  updated_at: Date;
  is_archived: boolean;
  deleted_at: Date | null;
}

export interface ConversationWithMessages extends Conversation {
  messages: Array<{
    id: string;
    role: string;
    content: string;
    created_at: Date;
    metadata: any;
  }>;
}

export class ConversationService {
  constructor(private db: Database) {}

  /**
   * Create a new conversation
   */
  async createConversation(userId: string, title?: string): Promise<Conversation> {
    const result = await this.db.queryOne<Conversation>(
      `INSERT INTO conversations (user_id, title)
       VALUES ($1, $2)
       RETURNING id, user_id, title, created_at, updated_at, is_archived, deleted_at`,
      [userId, title || null]
    );

    if (!result) {
      throw new Error('Failed to create conversation');
    }

    return result;
  }

  /**
   * Get a single conversation by ID
   */
  async getConversation(id: string, userId?: string): Promise<Conversation | null> {
    const query = userId
      ? `SELECT id, user_id, title, created_at, updated_at, is_archived, deleted_at
         FROM conversations
         WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`
      : `SELECT id, user_id, title, created_at, updated_at, is_archived, deleted_at
         FROM conversations
         WHERE id = $1 AND deleted_at IS NULL`;

    const params = userId ? [id, userId] : [id];
    return await this.db.queryOne<Conversation>(query, params);
  }

  /**
   * Get a conversation with all its messages
   */
  async getConversationWithMessages(
    id: string,
    userId?: string
  ): Promise<ConversationWithMessages | null> {
    const conversation = await this.getConversation(id, userId);
    if (!conversation) {
      return null;
    }

    const messages = await this.db.queryMany<{
      id: string;
      role: string;
      content: string;
      created_at: Date;
      metadata: any;
    }>(
      `SELECT id, role, content, created_at, metadata
       FROM messages
       WHERE conversation_id = $1 AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [id]
    );

    return {
      ...conversation,
      messages,
    };
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    includeArchived: boolean = false
  ): Promise<Conversation[]> {
    const archiveFilter = includeArchived ? '' : 'AND is_archived = false';

    return await this.db.queryMany<Conversation>(
      `SELECT id, user_id, title, created_at, updated_at, is_archived, deleted_at
       FROM conversations
       WHERE user_id = $1 AND deleted_at IS NULL ${archiveFilter}
       ORDER BY updated_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
  }

  /**
   * Update a conversation
   */
  async updateConversation(
    id: string,
    userId: string,
    updates: Partial<Pick<Conversation, 'title' | 'is_archived'>>
  ): Promise<Conversation | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.title !== undefined) {
      fields.push(`title = $${paramCount++}`);
      values.push(updates.title);
    }

    if (updates.is_archived !== undefined) {
      fields.push(`is_archived = $${paramCount++}`);
      values.push(updates.is_archived);
    }

    if (fields.length === 0) {
      // No updates, just return current conversation
      return await this.getConversation(id, userId);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, userId);

    const result = await this.db.queryOne<Conversation>(
      `UPDATE conversations
       SET ${fields.join(', ')}
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1} AND deleted_at IS NULL
       RETURNING id, user_id, title, created_at, updated_at, is_archived, deleted_at`,
      values
    );

    return result;
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(id: string, userId: string): Promise<boolean> {
    const result = await this.updateConversation(id, userId, { is_archived: true });
    return result !== null;
  }

  /**
   * Unarchive a conversation
   */
  async unarchiveConversation(id: string, userId: string): Promise<boolean> {
    const result = await this.updateConversation(id, userId, { is_archived: false });
    return result !== null;
  }

  /**
   * Soft delete a conversation
   */
  async deleteConversation(id: string, userId: string): Promise<boolean> {
    const result = await this.db.queryOne<{ id: string }>(
      `UPDATE conversations
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, userId]
    );

    return result !== null;
  }

  /**
   * Permanently delete a conversation (use with caution)
   */
  async hardDeleteConversation(id: string, userId: string): Promise<boolean> {
    const result = await this.db.queryOne<{ id: string }>(
      `DELETE FROM conversations
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, userId]
    );

    return result !== null;
  }

  /**
   * Get conversation count for a user
   */
  async getConversationCount(userId: string, includeArchived: boolean = false): Promise<number> {
    const archiveFilter = includeArchived ? '' : 'AND is_archived = false';

    const result = await this.db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM conversations
       WHERE user_id = $1 AND deleted_at IS NULL ${archiveFilter}`,
      [userId]
    );

    return result ? parseInt(result.count, 10) : 0;
  }
}
