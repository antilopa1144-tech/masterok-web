"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
}

export default function MarkdownContent({ content }: Props) {
  return (
    <div className="markdown-content space-y-2 text-sm leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-1">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="list-disc pl-5 my-1.5 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-1.5 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="leading-snug">{children}</li>,
          h1: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1">{children}</h3>,
          h2: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1">{children}</h3>,
          h3: ({ children }) => <h4 className="text-sm font-semibold mt-2 mb-1">{children}</h4>,
          h4: ({ children }) => <h4 className="text-sm font-semibold mt-1.5 mb-0.5">{children}</h4>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-600 dark:text-accent-400 underline underline-offset-2 hover:text-accent-700"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[0.85em] font-mono">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg overflow-x-auto text-xs my-1.5">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-3 my-1.5 text-slate-600 dark:text-slate-300 italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-50 dark:bg-slate-800">{children}</thead>,
          th: ({ children }) => (
            <th className="px-2 py-1.5 text-left font-semibold border-b border-slate-200 dark:border-slate-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800">{children}</td>
          ),
          hr: () => <hr className="my-2 border-slate-200 dark:border-slate-700" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
