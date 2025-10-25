import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import '../styles/MarkdownRenderer.css';

interface MarkdownRendererProps {
  content: string;
}

/**
 * Markdown renderer component with support for tables, code blocks, and GitHub-flavored markdown
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          // Custom rendering for code blocks
          code({ node, className, children, ...props }: any) {
            const inline = !className;
            const match = /language-(\w+)/.exec(className || '');
            return inline ? (
              <code className="inline-code" {...props}>
                {children}
              </code>
            ) : (
              <div className="code-block">
                <pre>
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          // Custom rendering for tables
          table({ children }) {
            return (
              <div className="table-wrapper">
                <table>{children}</table>
              </div>
            );
          },
          // Custom rendering for links (open in new tab)
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
