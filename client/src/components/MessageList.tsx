import React, { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Message, MessageRole, MessageStatus } from '../types/message.types';
import MarkdownRenderer from './MarkdownRenderer';
import '../styles/MessageList.css';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

/**
 * Message list component that displays chat messages with auto-scroll
 */
const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const formatTimestamp = (date: Date): string => {
    return format(new Date(date), 'h:mm a');
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="message-list">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`message message-${message.role} message-${message.status}`}
        >
          <div className="message-header">
            <span className="message-role">
              {message.role === MessageRole.USER ? 'You' : 'DANI'}
            </span>
            <span className="message-timestamp">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>

          <div className="message-content">
            {message.role === MessageRole.USER ? (
              <div className="user-message-text">{message.content}</div>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}
          </div>

          {message.status === MessageStatus.ERROR && (
            <div className="message-error">
              Failed to send message. Please try again.
            </div>
          )}

          {message.role === MessageRole.ASSISTANT && message.status === MessageStatus.RECEIVED && (
            <div className="message-actions">
              <button
                className="copy-button"
                onClick={() => copyToClipboard(message.content)}
                aria-label="Copy message"
                title="Copy to clipboard"
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
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>

              {message.usage && (
                <details className="token-info">
                  <summary>Token Usage</summary>
                  <div className="token-details">
                    <div className="token-row">
                      <span>Model:</span>
                      <span>{message.model}</span>
                    </div>
                    <div className="token-row">
                      <span>Iterations:</span>
                      <span>{message.iterations}</span>
                    </div>
                    <div className="token-row">
                      <span>Input tokens:</span>
                      <span>{message.usage.input_tokens.toLocaleString()}</span>
                    </div>
                    <div className="token-row">
                      <span>Output tokens:</span>
                      <span>{message.usage.output_tokens.toLocaleString()}</span>
                    </div>
                    <div className="token-row">
                      <span>Cache creation:</span>
                      <span>{message.usage.cache_creation_tokens.toLocaleString()}</span>
                    </div>
                    <div className="token-row">
                      <span>Cache read:</span>
                      <span>{message.usage.cache_read_tokens.toLocaleString()}</span>
                    </div>
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="message message-assistant message-loading">
          <div className="message-header">
            <span className="message-role">DANI</span>
          </div>
          <div className="message-content">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
