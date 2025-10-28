import React, { useState } from 'react';
import { submitFeedback } from '../services/feedbackService';
import { MessageFeedback } from '../types/message.types';
import '../styles/Feedback.css';

interface FeedbackButtonsProps {
  messageId: string;
  logId: string | null | undefined;
  existingFeedback?: MessageFeedback;
  onFeedbackSubmitted?: (feedback: MessageFeedback) => void;
}

/**
 * Feedback buttons component for collecting user feedback on DANI responses
 */
const FeedbackButtons: React.FC<FeedbackButtonsProps> = ({
  messageId,
  logId,
  existingFeedback,
  onFeedbackSubmitted,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<'positive' | 'negative' | null>(
    existingFeedback?.status || null
  );
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState(existingFeedback?.comment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [isDisabled, setIsDisabled] = useState(!!existingFeedback);

  // Don't show feedback buttons if there's no logId
  if (!logId) {
    return null;
  }

  const handleFeedbackClick = (status: 'positive' | 'negative') => {
    if (isDisabled) return;

    setSelectedStatus(status);
    setShowCommentBox(true);
    setSubmitStatus(null);
  };

  const handleSubmit = async () => {
    if (!selectedStatus || !logId) return;

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      await submitFeedback(logId, selectedStatus, comment || undefined);

      const feedback: MessageFeedback = {
        status: selectedStatus,
        comment: comment || undefined,
        timestamp: new Date().toISOString(),
      };

      setSubmitStatus('success');
      setIsDisabled(true);
      setShowCommentBox(false);

      // Notify parent component
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(feedback);
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    // Submit without comment
    if (selectedStatus && logId) {
      handleSubmitWithoutComment();
    }
  };

  const handleSubmitWithoutComment = async () => {
    if (!selectedStatus || !logId) return;

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      await submitFeedback(logId, selectedStatus);

      const feedback: MessageFeedback = {
        status: selectedStatus,
        timestamp: new Date().toISOString(),
      };

      setSubmitStatus('success');
      setIsDisabled(true);
      setShowCommentBox(false);

      // Notify parent component
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(feedback);
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="feedback-container">
      <div className="feedback-buttons">
        <button
          className={`feedback-button positive ${selectedStatus === 'positive' ? 'selected' : ''}`}
          onClick={() => handleFeedbackClick('positive')}
          disabled={isDisabled}
          aria-label="Positive feedback"
          title="This response was helpful"
        >
          <span className="feedback-emoji">👍</span>
        </button>

        <button
          className={`feedback-button negative ${selectedStatus === 'negative' ? 'selected' : ''}`}
          onClick={() => handleFeedbackClick('negative')}
          disabled={isDisabled}
          aria-label="Negative feedback"
          title="This response was not helpful"
        >
          <span className="feedback-emoji">👎</span>
        </button>

        {submitStatus === 'success' && (
          <span className="feedback-status success">
            ✓ Thank you for your feedback!
          </span>
        )}

        {submitStatus === 'error' && (
          <span className="feedback-status error">
            ✗ Failed to submit feedback. Please try again.
          </span>
        )}
      </div>

      {showCommentBox && !isDisabled && (
        <div className="feedback-comment-section">
          <label className="feedback-comment-label" htmlFor={`feedback-comment-${messageId}`}>
            What could be improved? (optional)
          </label>
          <textarea
            id={`feedback-comment-${messageId}`}
            className="feedback-comment-input"
            placeholder="Share your thoughts..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isSubmitting}
            rows={3}
          />
          <div className="feedback-comment-actions">
            <button
              className="feedback-submit-button"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
            <button
              className="feedback-skip-button"
              onClick={handleSkip}
              disabled={isSubmitting}
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackButtons;
