import React from 'react';
import { StoredConversation } from '../types/message.types';
import '../styles/ConversationSidebar.css';

interface ConversationSidebarProps {
  conversations: StoredConversation[];
  currentConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
}

/**
 * Sidebar component showing list of conversations
 */
const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}) => {
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const handleDelete = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation(); // Prevent selecting the conversation
    if (window.confirm('Delete this conversation? This cannot be undone.')) {
      onDeleteConversation(conversationId);
    }
  };

  return (
    <div className="conversation-sidebar">
      <div className="sidebar-header">
        <button
          className="new-conversation-btn"
          onClick={onNewConversation}
          title="Start a new conversation"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Chat
        </button>
      </div>

      <div className="conversations-list">
        {conversations.length === 0 ? (
          <div className="no-conversations">
            <p>No conversations yet</p>
            <p className="hint">Start a new chat to begin</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`conversation-item ${
                conversation.id === currentConversationId ? 'active' : ''
              }`}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <div className="conversation-content">
                <div className="conversation-title">{conversation.title}</div>
                <div className="conversation-meta">
                  <span className="conversation-date">
                    {formatDate(conversation.updatedAt)}
                  </span>
                  <span className="conversation-count">
                    {conversation.messages.length} messages
                  </span>
                </div>
              </div>
              <button
                className="delete-conversation-btn"
                onClick={(e) => handleDelete(e, conversation.id)}
                title="Delete conversation"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationSidebar;
