"use client";

import { useState, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownNote({ markdown }: { markdown: string }) {
  if (!markdown.trim()) return null;

  return (
    <div className="markdown-note space-y-4 text-[15px] leading-7 text-muted-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h3 className="mt-6 font-display text-base font-semibold tracking-tight text-foreground">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="mt-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {children}
            </h4>
          ),
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="leading-7">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-2 hover:text-muted-foreground"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-4">{children}</blockquote>
          ),
          hr: () => <hr className="border-border" />,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          code: Code,
          pre: ({ children }) => <div className="not-prose">{children}</div>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

function Code({ className, children, ...props }: ComponentPropsWithoutRef<"code">) {
  const text = String(children).replace(/\n$/, "");
  const inline = !className && !text.includes("\n");

  if (inline) {
    return (
      <code
        className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[13px]"
        {...props}
      >
        {text}
      </code>
    );
  }

  return <CopyableCode className={className}>{text}</CopyableCode>;
}

function CopyableCode({ className, children }: { className?: string; children: string }) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace("language-", "") ?? "bash";

  async function copy() {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <span className="relative block overflow-x-auto rounded-xl border border-border bg-muted p-4 text-sm leading-6">
      <span className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
        {language}
        <button
          type="button"
          onClick={copy}
          className="rounded px-1.5 py-0.5 hover:bg-card hover:text-foreground"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </span>
      <code className="font-mono text-[13px]">{children}</code>
    </span>
  );
}
