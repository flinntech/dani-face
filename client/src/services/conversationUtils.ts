/**
 * Utility functions to convert between backend and frontend conversation types
 */

import {
  StoredConversation,
  Message,
  MessageRole,
  MessageStatus,
  BackendConversation,
  BackendMessage,
  BackendConversationWithMessages,
} from '../types/message.types';

/**
 * Convert backend message to frontend message format
 */
export function backendMessageToFrontend(backendMsg: BackendMessage): Message {
  return {
    id: backendMsg.id,
    role: backendMsg.role as MessageRole,
    content: backendMsg.content,
    timestamp: new Date(backendMsg.created_at),
    status: MessageStatus.RECEIVED,
    // Include metadata fields if they exist
    usage: backendMsg.metadata?.usage,
    model: backendMsg.metadata?.model,
    iterations: backendMsg.metadata?.iterations,
    toolCallDetails: backendMsg.metadata?.toolCallDetails,
    reasoningSteps: backendMsg.metadata?.reasoningSteps,
    logId: backendMsg.metadata?.logId,
    feedback: backendMsg.metadata?.feedback,
  };
}

/**
 * Convert backend conversation (with messages) to frontend StoredConversation
 */
export function backendConversationToFrontend(
  backendConv: BackendConversationWithMessages
): StoredConversation {
  // Generate title from first user message if no title set
  let title = backendConv.title;
  if (!title && backendConv.messages.length > 0) {
    const firstUserMsg = backendConv.messages.find((m) => m.role === 'user');
    if (firstUserMsg) {
      title = firstUserMsg.content.substring(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '');
    } else {
      title = 'New Conversation';
    }
  }

  return {
    id: backendConv.id,
    title: title || 'New Conversation',
    createdAt: new Date(backendConv.created_at),
    updatedAt: new Date(backendConv.updated_at),
    messages: backendConv.messages.map(backendMessageToFrontend),
  };
}

/**
 * Convert backend conversation (without messages) to frontend StoredConversation
 */
export function backendConversationToFrontendWithoutMessages(
  backendConv: BackendConversation
): StoredConversation {
  return {
    id: backendConv.id,
    title: backendConv.title || 'New Conversation',
    createdAt: new Date(backendConv.created_at),
    updatedAt: new Date(backendConv.updated_at),
    messages: [],
  };
}
