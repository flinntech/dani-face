/**
 * LogDetailView Component
 * Detailed view of a single conversation execution
 */

import React from 'react';
import { ConversationLog } from '../../types/log.types';
import './LogDetailView.css';

interface LogDetailViewProps {
  log: ConversationLog;
  onClose: () => void;
}

const LogDetailView: React.FC<LogDetailViewProps> = ({ log, onClose }) => {
  const { log_data } = log;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  return (
    <div className="log-detail-modal-overlay" onClick={onClose}>
      <div className="log-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Conversation Execution Detail</h2>
          <button onClick={onClose} className="close-button">
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Metadata */}
          <section className="detail-section">
            <h3>Metadata</h3>
            <div className="metadata-grid">
              <div>
                <strong>Log ID:</strong> {log.id}
              </div>
              <div>
                <strong>User:</strong> {log_data.username}
              </div>
              <div>
                <strong>Timestamp:</strong> {formatDate(log.timestamp)}
              </div>
              <div>
                <strong>Execution Time:</strong> {formatDuration(log_data.execution_time_ms)}
              </div>
              <div>
                <strong>Model:</strong> {log_data.response.model_used}
              </div>
              <div>
                <strong>Complexity:</strong> {log_data.query.analyzer_output.complexity_level}
              </div>
              <div>
                <strong>Iterations:</strong> {log_data.execution.iterations}
              </div>
              <div>
                <strong>Tools Used:</strong> {log_data.execution.tool_calls.length}
              </div>
            </div>
          </section>

          {/* User Query */}
          <section className="detail-section">
            <div className="section-header">
              <h3>User Query</h3>
              <button
                onClick={() => copyToClipboard(log_data.query.original_text, 'Query')}
                className="btn-copy"
              >
                Copy
              </button>
            </div>
            <div className="query-box">{log_data.query.original_text}</div>
          </section>

          {/* Query Analyzer Decision */}
          <section className="detail-section">
            <h3>Query Analyzer Decision</h3>
            <div className="analyzer-box">
              <div>
                <strong>Selected Model:</strong> {log_data.query.analyzer_output.selected_model}
              </div>
              <div>
                <strong>Complexity Level:</strong> {log_data.query.analyzer_output.complexity_level}
              </div>
              {log_data.query.analyzer_output.reasoning && (
                <div>
                  <strong>Reasoning:</strong> {log_data.query.analyzer_output.reasoning}
                </div>
              )}
            </div>
          </section>

          {/* Tool Calls */}
          {log_data.execution.tool_calls.length > 0 && (
            <section className="detail-section">
              <h3>Tool Calls ({log_data.execution.tool_calls.length})</h3>
              {log_data.execution.tool_calls.map((tool, index) => (
                <details key={index} className="tool-call-details">
                  <summary>
                    <strong>{tool.tool_name}</strong> ({tool.server}) - {formatDuration(tool.execution_time_ms)}
                    {tool.is_error && <span className="error-badge">ERROR</span>}
                  </summary>
                  <div className="tool-call-content">
                    <div className="tool-section">
                      <strong>Input:</strong>
                      <pre>{JSON.stringify(tool.input, null, 2)}</pre>
                    </div>
                    <div className="tool-section">
                      <strong>Output:</strong>
                      <pre>{JSON.stringify(tool.output, null, 2)}</pre>
                    </div>
                    <div className="tool-meta">
                      <span>Iteration: {tool.iteration}</span>
                      <span>Time: {formatDate(tool.timestamp)}</span>
                    </div>
                  </div>
                </details>
              ))}
            </section>
          )}

          {/* Reasoning Steps */}
          {log_data.execution.reasoning_steps.length > 0 && (
            <section className="detail-section">
              <h3>Reasoning Steps ({log_data.execution.reasoning_steps.length})</h3>
              {log_data.execution.reasoning_steps.map((step, index) => (
                <div key={index} className="reasoning-step">
                  <div className="step-header">
                    <strong>Step {step.step_order + 1}</strong> (Iteration {step.iteration})
                  </div>
                  {step.tools_requested.length > 0 && (
                    <div>
                      <strong>Tools Requested:</strong> {step.tools_requested.join(', ')}
                    </div>
                  )}
                  {step.thinking_content && (
                    <div className="thinking-content">
                      <strong>Thinking:</strong>
                      <pre>{step.thinking_content}</pre>
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Final Response */}
          <section className="detail-section">
            <div className="section-header">
              <h3>Final Response</h3>
              <button
                onClick={() => copyToClipboard(log_data.response.final_text, 'Response')}
                className="btn-copy"
              >
                Copy
              </button>
            </div>
            <div className="response-box">{log_data.response.final_text}</div>
          </section>

          {/* Token Usage */}
          <section className="detail-section">
            <h3>Token Usage</h3>
            <div className="token-grid">
              <div>
                <strong>Input:</strong> {log_data.response.usage.input_tokens.toLocaleString()}
              </div>
              <div>
                <strong>Output:</strong> {log_data.response.usage.output_tokens.toLocaleString()}
              </div>
              {log_data.response.usage.cache_creation_tokens !== undefined && (
                <div>
                  <strong>Cache Creation:</strong> {log_data.response.usage.cache_creation_tokens.toLocaleString()}
                </div>
              )}
              {log_data.response.usage.cache_read_tokens !== undefined && (
                <div>
                  <strong>Cache Read:</strong> {log_data.response.usage.cache_read_tokens.toLocaleString()}
                </div>
              )}
            </div>
          </section>

          {/* Feedback */}
          <section className="detail-section">
            <h3>Feedback</h3>
            <div>
              <strong>Status:</strong> {log_data.feedback.status || 'None'}
            </div>
            {log_data.feedback.comment && (
              <div>
                <strong>Comment:</strong> {log_data.feedback.comment}
              </div>
            )}
          </section>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogDetailView;
