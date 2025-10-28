import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Message,
  MessageRole,
  MessageStatus,
  MessageFeedback,
  ConversationState,
  StoredConversation,
} from '../types/message.types';
import { sendChatMessage } from '../services/api';
import ConversationSidebar from './ConversationSidebar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import WelcomeMessage from './WelcomeMessage';
import {
  loadConversations,
  saveConversations,
  getCurrentConversationId,
  setCurrentConversationId,
  createConversation,
  updateConversation,
  deleteConversation as deleteConversationFromStorage,
  getConversation,
} from '../services/conversationStorage';
import '../styles/ChatInterface.css';

interface ChatInterfaceProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

/**
 * Main chat interface component with conversation history
 */
const ChatInterface: React.FC<ChatInterfaceProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [conversation, setConversation] = useState<ConversationState>({
    conversationId: '',
    messages: [],
    isLoading: false,
    error: null,
  });

  // Load conversations on mount
  useEffect(() => {
    const loadedConversations = loadConversations();
    setConversations(loadedConversations);

    // Get or create current conversation
    let currentId = getCurrentConversationId();
    let currentConversation: StoredConversation | null = null;

    if (!currentId || !getConversation(loadedConversations, currentId)) {
      // No current conversation or it doesn't exist, create new one
      currentId = uuidv4();
      const newConv = createConversation(currentId);
      setConversations([newConv, ...loadedConversations]);
      saveConversations([newConv, ...loadedConversations]);
      setCurrentConversationId(currentId);
      currentConversation = newConv;
    } else {
      currentConversation = getConversation(loadedConversations, currentId);
    }

    // Load the current conversation (guaranteed to exist now)
    if (currentConversation) {
      setConversation({
        conversationId: currentConversation.id,
        messages: currentConversation.messages,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  // Save conversations whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      saveConversations(conversations);
    }
  }, [conversations]);

  const handleSendMessage = async (content: string) => {
    // Ensure we have a conversation ID
    if (!conversation.conversationId) {
      console.error('Cannot send message: No conversation ID');
      setConversation((prev) => ({
        ...prev,
        error: 'Failed to initialize conversation. Please refresh the page.',
      }));
      return;
    }

    // Create user message
    const userMessage: Message = {
      id: uuidv4(),
      role: MessageRole.USER,
      content,
      timestamp: new Date(),
      status: MessageStatus.SENDING,
    };

    // Add user message to conversation
    const updatedMessages = [...conversation.messages, userMessage];
    setConversation((prev) => ({
      ...prev,
      messages: updatedMessages,
      isLoading: true,
      error: null,
    }));

    try {
      // Mark user message as sent
      const sentMessages = updatedMessages.map((msg) =>
        msg.id === userMessage.id ? { ...msg, status: MessageStatus.SENT } : msg
      );

      setConversation((prev) => ({
        ...prev,
        messages: sentMessages,
      }));

      // Send message to agent
      const response = await sendChatMessage(content, conversation.conversationId);

      // Create assistant message with logId for feedback tracking
      const assistantMessage: Message = {
        id: uuidv4(),
        role: MessageRole.ASSISTANT,
        content: response.response,
        timestamp: new Date(),
        status: MessageStatus.RECEIVED,
        usage: response.usage,
        model: response.model,
        iterations: response.iterations,
        toolCallDetails: response.toolCallDetails,
        reasoningSteps: response.reasoningSteps,
        logId: response.logId, // Store logId for feedback
      };

      // Add assistant message to conversation
      const finalMessages = [...sentMessages, assistantMessage];
      setConversation((prev) => ({
        ...prev,
        messages: finalMessages,
        isLoading: false,
      }));

      // Update conversation history
      const updatedConversations = updateConversation(
        conversations,
        conversation.conversationId,
        finalMessages
      );
      setConversations(updatedConversations);
    } catch (error) {
      console.error('Failed to send message:', error);

      // Mark user message as error
      const errorMessages = updatedMessages.map((msg) =>
        msg.id === userMessage.id ? { ...msg, status: MessageStatus.ERROR } : msg
      );

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

      const finalMessages = [...errorMessages, errorMessage];
      setConversation((prev) => ({
        ...prev,
        messages: finalMessages,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      }));

      // Update conversation history even with error
      const updatedConversations = updateConversation(
        conversations,
        conversation.conversationId,
        finalMessages
      );
      setConversations(updatedConversations);
    }
  };

  const handleNewConversation = () => {
    const newConversationId = uuidv4();
    const newConv = createConversation(newConversationId);

    setConversations([newConv, ...conversations]);
    setCurrentConversationId(newConversationId);
    setConversation({
      conversationId: newConversationId,
      messages: [],
      isLoading: false,
      error: null,
    });
  };

  const handleSelectConversation = (conversationId: string) => {
    const selected = getConversation(conversations, conversationId);
    if (selected) {
      setCurrentConversationId(conversationId);
      setConversation({
        conversationId: selected.id,
        messages: selected.messages,
        isLoading: false,
        error: null,
      });
      // Close sidebar on mobile after selecting conversation
      setSidebarOpen(false);
    }
  };

  const handleDeleteConversation = (conversationId: string) => {
    const updatedConversations = deleteConversationFromStorage(conversations, conversationId);
    setConversations(updatedConversations);

    // If we deleted the current conversation, switch to another or create new
    if (conversationId === conversation.conversationId) {
      if (updatedConversations.length > 0) {
        // Switch to the first conversation
        const firstConv = updatedConversations[0];
        setCurrentConversationId(firstConv.id);
        setConversation({
          conversationId: firstConv.id,
          messages: firstConv.messages,
          isLoading: false,
          error: null,
        });
      } else {
        // No conversations left, create a new one
        handleNewConversation();
      }
    }
  };

  const handleFeedbackSubmitted = (messageId: string, feedback: MessageFeedback) => {
    // Update the message with feedback in current conversation state
    const updatedMessages = conversation.messages.map((msg) =>
      msg.id === messageId ? { ...msg, feedback } : msg
    );

    setConversation((prev) => ({
      ...prev,
      messages: updatedMessages,
    }));

    // Update the conversation in storage
    const updatedConversations = updateConversation(
      conversations,
      conversation.conversationId,
      updatedMessages
    );
    setConversations(updatedConversations);
  };

  return (
    <div className="chat-interface-with-sidebar">
      {/* Overlay for mobile - only show when sidebar is open on mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <ConversationSidebar
        conversations={conversations}
        currentConversationId={conversation.conversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="chat-interface">
        <main className="chat-main">
          {conversation.messages.length === 0 ? (
            <WelcomeMessage />
          ) : (
            <MessageList
              messages={conversation.messages}
              isLoading={conversation.isLoading}
              onFeedbackSubmitted={handleFeedbackSubmitted}
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
                : 'Ask DANI (Digi Artificial Network Intelligence) anything about your network infrastructure...'
            }
          />
          <div className="footer-disclaimer">
            <em>DANI can make mistakes. Please check all responses.</em>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ChatInterface;
