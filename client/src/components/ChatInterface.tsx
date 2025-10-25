import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Message,
  MessageRole,
  MessageStatus,
  ConversationState,
} from '../types/message.types';
import { sendChatMessage } from '../services/api';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import WelcomeMessage from './WelcomeMessage';
import '../styles/ChatInterface.css';

const CONVERSATION_STORAGE_KEY = 'dani-conversation';
const CONVERSATION_ID_KEY = 'dani-conversation-id';

/**
 * Main chat interface component
 */
const ChatInterface: React.FC = () => {
  const [conversation, setConversation] = useState<ConversationState>({
    conversationId: '',
    messages: [],
    isLoading: false,
    error: null,
  });

  // Initialize conversation from localStorage or create new one
  useEffect(() => {
    const storedConversationId = sessionStorage.getItem(CONVERSATION_ID_KEY);
    const storedMessages = localStorage.getItem(CONVERSATION_STORAGE_KEY);

    let conversationId = storedConversationId;
    if (!conversationId) {
      conversationId = uuidv4();
      sessionStorage.setItem(CONVERSATION_ID_KEY, conversationId);
    }

    let messages: Message[] = [];
    if (storedMessages) {
      try {
        const parsed = JSON.parse(storedMessages);
        messages = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
      } catch (err) {
        console.error('Failed to parse stored messages:', err);
      }
    }

    setConversation((prev) => ({
      ...prev,
      conversationId,
      messages,
    }));
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (conversation.messages.length > 0) {
      localStorage.setItem(
        CONVERSATION_STORAGE_KEY,
        JSON.stringify(conversation.messages)
      );
    }
  }, [conversation.messages]);

  const handleSendMessage = async (content: string) => {
    // Create user message
    const userMessage: Message = {
      id: uuidv4(),
      role: MessageRole.USER,
      content,
      timestamp: new Date(),
      status: MessageStatus.SENDING,
    };

    // Add user message to conversation
    setConversation((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      // Mark user message as sent
      setConversation((prev) => ({
        ...prev,
        messages: prev.messages.map((msg) =>
          msg.id === userMessage.id
            ? { ...msg, status: MessageStatus.SENT }
            : msg
        ),
      }));

      // Send message to agent
      const response = await sendChatMessage(content, conversation.conversationId);

      // Create assistant message
      const assistantMessage: Message = {
        id: uuidv4(),
        role: MessageRole.ASSISTANT,
        content: response.response,
        timestamp: new Date(),
        status: MessageStatus.RECEIVED,
        usage: response.usage,
        model: response.model,
        iterations: response.iterations,
      };

      // Add assistant message to conversation
      setConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to send message:', error);

      // Mark user message as error
      setConversation((prev) => ({
        ...prev,
        messages: prev.messages.map((msg) =>
          msg.id === userMessage.id
            ? { ...msg, status: MessageStatus.ERROR }
            : msg
        ),
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      }));

      // Create error message from assistant
      const errorMessage: Message = {
        id: uuidv4(),
        role: MessageRole.ASSISTANT,
        content: `I apologize, but I encountered an error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }\n\nPlease try again.`,
        timestamp: new Date(),
        status: MessageStatus.RECEIVED,
      };

      setConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
      }));
    }
  };

  const handleNewConversation = () => {
    const newConversationId = uuidv4();
    sessionStorage.setItem(CONVERSATION_ID_KEY, newConversationId);
    localStorage.removeItem(CONVERSATION_STORAGE_KEY);

    setConversation({
      conversationId: newConversationId,
      messages: [],
      isLoading: false,
      error: null,
    });
  };

  return (
    <div className="chat-interface">
      <header className="chat-header">
        <div className="header-content">
          <h1 className="header-title">DANI WebChat</h1>
          <button
            className="new-conversation-button"
            onClick={handleNewConversation}
            disabled={conversation.isLoading}
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
      </header>

      <main className="chat-main">
        {conversation.messages.length === 0 ? (
          <WelcomeMessage />
        ) : (
          <MessageList
            messages={conversation.messages}
            isLoading={conversation.isLoading}
          />
        )}
      </main>

      <footer className="chat-footer">
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={conversation.isLoading}
          placeholder={
            conversation.isLoading
              ? 'Waiting for response...'
              : 'Ask DANI anything about your network infrastructure...'
          }
        />
        <div className="footer-disclaimer">
          <em>DANI can make mistakes. Please check all responses.</em>
        </div>
      </footer>
    </div>
  );
};

export default ChatInterface;
