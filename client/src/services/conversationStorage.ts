/**
 * Service for managing conversation history in localStorage
 */

import { StoredConversation, Message } from '../types/message.types';

const CONVERSATIONS_KEY = 'dani-conversations';
const CURRENT_CONVERSATION_KEY = 'dani-current-conversation-id';

/**
 * Generate a title from the first user message
 */
function generateTitle(messages: Message[]): string {
  const firstUserMessage = messages.find(msg => msg.role === 'user');
  if (!firstUserMessage) {
    return 'New Conversation';
  }

  // Take first 50 characters of the first message
  const content = firstUserMessage.content.trim();
  if (content.length <= 50) {
    return content;
  }
  return content.substring(0, 47) + '...';
}

/**
 * Load all conversations from localStorage
 */
export function loadConversations(): StoredConversation[] {
  try {
    const stored = localStorage.getItem(CONVERSATIONS_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    return parsed.map((conv: any) => ({
      ...conv,
      createdAt: new Date(conv.createdAt),
      updatedAt: new Date(conv.updatedAt),
      messages: conv.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })),
    }));
  } catch (error) {
    console.error('Failed to load conversations:', error);
    return [];
  }
}

/**
 * Save all conversations to localStorage
 */
export function saveConversations(conversations: StoredConversation[]): void {
  try {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  } catch (error) {
    console.error('Failed to save conversations:', error);
  }
}

/**
 * Get the current conversation ID
 */
export function getCurrentConversationId(): string | null {
  return sessionStorage.getItem(CURRENT_CONVERSATION_KEY);
}

/**
 * Set the current conversation ID
 */
export function setCurrentConversationId(id: string): void {
  sessionStorage.setItem(CURRENT_CONVERSATION_KEY, id);
}

/**
 * Create a new conversation
 */
export function createConversation(id: string): StoredConversation {
  const now = new Date();
  return {
    id,
    title: 'New Conversation',
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

/**
 * Update an existing conversation
 */
export function updateConversation(
  conversations: StoredConversation[],
  conversationId: string,
  messages: Message[]
): StoredConversation[] {
  const existingIndex = conversations.findIndex(c => c.id === conversationId);

  const updatedConversation: StoredConversation = {
    id: conversationId,
    title: generateTitle(messages),
    createdAt: existingIndex >= 0 ? conversations[existingIndex].createdAt : new Date(),
    updatedAt: new Date(),
    messages,
  };

  if (existingIndex >= 0) {
    // Update existing conversation
    const updated = [...conversations];
    updated[existingIndex] = updatedConversation;
    return updated;
  } else {
    // Add new conversation to the beginning
    return [updatedConversation, ...conversations];
  }
}

/**
 * Delete a conversation
 */
export function deleteConversation(
  conversations: StoredConversation[],
  conversationId: string
): StoredConversation[] {
  return conversations.filter(c => c.id !== conversationId);
}

/**
 * Get a specific conversation by ID
 */
export function getConversation(
  conversations: StoredConversation[],
  conversationId: string
): StoredConversation | null {
  return conversations.find(c => c.id === conversationId) || null;
}
