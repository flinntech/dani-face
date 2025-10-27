/**
 * ToolCallDetails Component
 * Displays tool call and reasoning information in a collapsible section
 */

import React, { useState } from 'react';
import { ToolCallDetail, ReasoningStep } from '../types/message.types';
import '../styles/ToolCallDetails.css';

interface ToolCallDetailsProps {
  toolCallDetails?: ToolCallDetail[];
  reasoningSteps?: ReasoningStep[];
}

const ToolCallDetails: React.FC<ToolCallDetailsProps> = ({
  toolCallDetails,
  reasoningSteps,
}) => {
  const [copied, setCopied] = useState(false);

  // Don't render if no data
  if (!toolCallDetails || toolCallDetails.length === 0) {
    return null;
  }

  const handleCopy = async () => {
    const detailsData = {
      toolCalls: toolCallDetails,
      reasoning: reasoningSteps,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(detailsData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy details:', error);
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatJSON = (obj: unknown): string => {
    return JSON.stringify(obj, null, 2);
  };

  const toolCount = toolCallDetails.length;
  const totalDuration = toolCallDetails.reduce((sum, tool) => sum + tool.duration, 0);

  return (
    <details className="tool-call-details">
      <summary className="tool-call-summary">
        Show tool calls and reasoning ({toolCount} tool{toolCount !== 1 ? 's' : ''}, {formatDuration(totalDuration)}) ▼
      </summary>

      <div className="tool-call-content">
        <div className="tool-call-header">
          <h4>Execution Details</h4>
          <button
            className="copy-button"
            onClick={handleCopy}
            title="Copy details as JSON"
          >
            {copied ? '✓ Copied!' : 'Copy Details'}
          </button>
        </div>

        {/* Reasoning Steps */}
        {reasoningSteps && reasoningSteps.length > 0 && (
          <div className="reasoning-steps-section">
            <h5>Reasoning Steps</h5>
            {reasoningSteps.map((step, index) => (
              <div key={index} className="reasoning-step">
                <div className="reasoning-step-header">
                  <span className="iteration-badge">Iteration {step.iteration}</span>
                  <span className="timestamp">{formatTimestamp(step.timestamp)}</span>
                </div>
                <div className="reasoning-step-content">
                  <p className="tools-requested">
                    <strong>Tools Requested:</strong> {step.toolsRequested.join(', ')}
                  </p>
                  {step.thinking && (
                    <details className="thinking-section">
                      <summary>Thinking Process</summary>
                      <pre className="thinking-content">{step.thinking}</pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tool Calls */}
        <div className="tool-calls-section">
          <h5>Tool Executions</h5>
          {toolCallDetails.map((tool, index) => (
            <div
              key={index}
              className={`tool-call ${tool.isError ? 'tool-call-error' : 'tool-call-success'}`}
            >
              <div className="tool-call-header-row">
                <div className="tool-info">
                  <span className={`tool-badge ${tool.isError ? 'tool-badge-error' : 'tool-badge-success'}`}>
                    {tool.toolName}
                  </span>
                  {tool.server && (
                    <span className="server-badge">{tool.server}</span>
                  )}
                  <span className="iteration-badge-small">iter {tool.iteration}</span>
                </div>
                <div className="tool-meta">
                  <span className="timestamp">{formatTimestamp(tool.timestamp)}</span>
                  <span className="duration">{formatDuration(tool.duration)}</span>
                  <span className={`status-badge ${tool.isError ? 'status-error' : 'status-success'}`}>
                    {tool.isError ? '✗ Error' : '✓ Success'}
                  </span>
                </div>
              </div>

              <details className="tool-input-section">
                <summary>Input Parameters</summary>
                <pre className="code-block">
                  <code>{formatJSON(tool.input)}</code>
                </pre>
              </details>

              <details className="tool-output-section">
                <summary>Output Result</summary>
                <pre className="code-block">
                  <code>{tool.output}</code>
                </pre>
              </details>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
};

export default ToolCallDetails;
