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
import {
  sendChatMessage,
  fetchConversations,
  fetchConversationWithMessages,
  createConversation as createConversationAPI,
  deleteConversation as deleteConversationAPI,
} from '../services/api';
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
  getConversation,
} from '../services/conversationStorage';
import {
  backendConversationToFrontend,
  backendConversationToFrontendWithoutMessages,
} from '../services/conversationUtils';
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

  // Load conversations on mount - fetch from backend first, fallback to localStorage
  useEffect(() => {
    const loadConversationsFromBackend = async () => {
      try {
        setConversation((prev) => ({ ...prev, isLoading: true }));

        // Fetch conversations from backend
        const response = await fetchConversations(50, 0, false);

        if (response.conversations.length === 0) {
          // No conversations in backend, create a new one
          const newConv = await createConversationAPI();
          const frontendConv = backendConversationToFrontendWithoutMessages(newConv);
          setConversations([frontendConv]);
          saveConversations([frontendConv]); // Cache to localStorage
          setCurrentConversationId(frontendConv.id);
          setConversation({
            conversationId: frontendConv.id,
            messages: [],
            isLoading: false,
            error: null,
          });
        } else {
          // Convert backend conversations to frontend format
          const frontendConversations = response.conversations.map(
            backendConversationToFrontendWithoutMessages
          );
          setConversations(frontendConversations);
          saveConversations(frontendConversations); // Cache to localStorage

          // Get or set current conversation
          let currentId: string = getCurrentConversationId() || frontendConversations[0].id;
          const currentExists = frontendConversations.find((c) => c.id === currentId);

          if (!currentExists) {
            // Current conversation doesn't exist in backend, use the first one
            currentId = frontendConversations[0].id;
          }

          // Ensure current ID is saved
          setCurrentConversationId(currentId);

          // Load messages for the current conversation
          const conversationWithMessages = await fetchConversationWithMessages(currentId);
          const fullConversation = backendConversationToFrontend(conversationWithMessages);

          // Update conversations list with loaded messages
          const updatedConversations = frontendConversations.map((c) =>
            c.id === currentId ? fullConversation : c
          );
          setConversations(updatedConversations);
          saveConversations(updatedConversations); // Update cache

          setConversation({
            conversationId: fullConversation.id,
            messages: fullConversation.messages,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('Failed to load conversations from backend:', error);

        // Fallback to localStorage if backend fetch fails
        const cachedConversations = loadConversations();
        if (cachedConversations.length > 0) {
          setConversations(cachedConversations);
          const currentId = getCurrentConversationId();
          const currentConv = currentId
            ? getConversation(cachedConversations, currentId) || cachedConversations[0]
            : cachedConversations[0];

          setConversation({
            conversationId: currentConv.id,
            messages: currentConv.messages,
            isLoading: false,
            error: null,
          });
          setCurrentConversationId(currentConv.id);
        } else {
          // No cached conversations and backend failed, create a local-only conversation
          const newId = uuidv4();
          const newConv = createConversation(newId);
          setConversations([newConv]);
          saveConversations([newConv]);
          setCurrentConversationId(newId);
          setConversation({
            conversationId: newId,
            messages: [],
            isLoading: false,
            error: 'Unable to load conversations. Working offline.',
          });
        }
      }
    };

    loadConversationsFromBackend();
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

      // Update conversation ID if backend returned a different one (first message in conversation)
      const dbConversationId = response.conversationId;
      if (dbConversationId && dbConversationId !== conversation.conversationId) {
        console.log('Syncing conversation ID from backend:', dbConversationId);
        setConversation((prev) => ({
          ...prev,
          conversationId: dbConversationId,
        }));
        setCurrentConversationId(dbConversationId);

        // Update the conversation ID in the conversations list
        const updatedConversations = conversations.map((c) =>
          c.id === conversation.conversationId ? { ...c, id: dbConversationId } : c
        );
        setConversations(updatedConversations);
        saveConversations(updatedConversations);
      }

      // Create assistant message with logId for feedback tracking
      // Use database message IDs if provided
      const assistantMessage: Message = {
        id: response.assistantMessageId || uuidv4(),
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

      // Update user message ID with database ID if provided
      const finalMessages = [
        ...sentMessages.map((msg) =>
          msg.id === userMessage.id && response.userMessageId
            ? { ...msg, id: response.userMessageId }
            : msg
        ),
        assistantMessage,
      ];

      setConversation((prev) => ({
        ...prev,
        messages: finalMessages,
        isLoading: false,
        conversationId: dbConversationId || prev.conversationId,
      }));

      // Update conversation history with the database conversation ID
      const updatedConversations = updateConversation(
        conversations,
        dbConversationId || conversation.conversationId,
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

  const handleNewConversation = async () => {
    try {
      // Create conversation in backend first
      const backendConv = await createConversationAPI();
      const newConv = backendConversationToFrontendWithoutMessages(backendConv);

      setConversations([newConv, ...conversations]);
      saveConversations([newConv, ...conversations]); // Update cache
      setCurrentConversationId(newConv.id);
      setConversation({
        conversationId: newConv.id,
        messages: [],
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to create conversation in backend:', error);

      // Fallback to local-only conversation if API fails
      const newConversationId = uuidv4();
      const newConv = createConversation(newConversationId);

      setConversations([newConv, ...conversations]);
      saveConversations([newConv, ...conversations]);
      setCurrentConversationId(newConversationId);
      setConversation({
        conversationId: newConversationId,
        messages: [],
        isLoading: false,
        error: null,
      });
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    const selected = getConversation(conversations, conversationId);
    if (!selected) return;

    setCurrentConversationId(conversationId);

    // If messages already loaded (from cache), use them immediately
    if (selected.messages.length > 0) {
      setConversation({
        conversationId: selected.id,
        messages: selected.messages,
        isLoading: false,
        error: null,
      });
      setSidebarOpen(false);
      return;
    }

    // Messages not loaded, fetch from backend
    try {
      setConversation({
        conversationId: selected.id,
        messages: [],
        isLoading: true,
        error: null,
      });

      const conversationWithMessages = await fetchConversationWithMessages(conversationId);
      const fullConversation = backendConversationToFrontend(conversationWithMessages);

      // Update conversations list with loaded messages
      const updatedConversations = conversations.map((c) =>
        c.id === conversationId ? fullConversation : c
      );
      setConversations(updatedConversations);
      saveConversations(updatedConversations); // Update cache

      setConversation({
        conversationId: fullConversation.id,
        messages: fullConversation.messages,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to load conversation messages:', error);
      setConversation({
        conversationId: selected.id,
        messages: [],
        isLoading: false,
        error: 'Failed to load messages. Please try again.',
      });
    }

    // Close sidebar on mobile after selecting conversation
    setSidebarOpen(false);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      // Delete from backend first
      await deleteConversationAPI(conversationId);
    } catch (error) {
      console.error('Failed to delete conversation from backend:', error);
      // Continue with local deletion even if backend fails
    }

    // Delete from local state regardless of backend result
    const updatedConversations = conversations.filter((c) => c.id !== conversationId);
    setConversations(updatedConversations);
    saveConversations(updatedConversations); // Update cache

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
        await handleNewConversation();
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
