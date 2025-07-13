import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MarkdownWithLatexProps {
  children: string;
  className?: string;
}

export default function MarkdownWithLatex({ children, className }: MarkdownWithLatexProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[
          [remarkMath, {
            singleDollarTextMath: false, // Disable single $ for inline math
            doubleDollarTextMath: 'inline' // Use $$ for inline math
          }]
        ]}
        rehypePlugins={[rehypeKatex]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
} 