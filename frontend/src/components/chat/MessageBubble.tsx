import { memo, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import { cn } from "@/lib/utils"
import { Bot, User, Copy, Check } from "lucide-react"
import { useState, useCallback } from "react"

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [["href", /^https?:\/\//]],
  },
}

function sanitizeResponse(text: string): string {
  return text
    .replace(/javascript\s*:/gi, "")
    .replace(/data\s*:/gi, "")
    .replace(/vbscript\s*:/gi, "")
}

interface CodeBlockProps {
  children?: React.ReactNode
  inline?: boolean
  className?: string
}

const CodeBlock = memo(function CodeBlock({ children, inline }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    const text = String(children ?? "")
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }, [children])

  if (inline) {
    return (
      <code className="bg-black/10 dark:bg-white/12 text-primary dark:text-emerald-400 px-1.5 py-0.5 rounded-md text-[0.78em] font-mono font-medium">
        {children}
      </code>
    )
  }

  return (
    <div className="relative group/code my-3 rounded-xl overflow-hidden border border-black/08 dark:border-white/10">
      <div className="flex items-center justify-between bg-black/05 dark:bg-white/05 px-4 py-2 border-b border-black/06 dark:border-white/08">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">code</span>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 text-[10px] font-mono transition-all duration-200",
            "opacity-0 group-hover/code:opacity-100",
            copied
              ? "text-emerald-500 dark:text-emerald-400"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="bg-black/03 dark:bg-black/40 overflow-x-auto px-4 py-3 text-xs font-mono leading-relaxed text-foreground/90">
        <code>{children}</code>
      </pre>
    </div>
  )
})

interface MessageBubbleProps {
  content: string
  role: "user" | "bot"
  timestamp?: Date
}

const MessageBubble = memo(function MessageBubble({
  content,
  role,
  timestamp,
}: MessageBubbleProps) {
  const formattedTime = useMemo(() => {
    if (!timestamp) return ""
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(timestamp)
  }, [timestamp])

  const isUser = role === "user"

  return (
    <div
      className={cn(
        "flex gap-2.5 w-full animate-slide-up",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl shadow-sm",
          isUser
            ? "bg-gradient-to-br from-primary to-emerald-600 shadow-primary/20"
            : [
                "backdrop-blur-md border",
                "bg-white/60 border-black/08 dark:bg-white/06 dark:border-white/10",
              ]
        )}
        aria-hidden="true"
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-primary dark:text-emerald-400" />
        )}
      </div>

      {/* Bubble + timestamp column */}
      <div
        className={cn(
          "flex flex-col gap-1 max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
            isUser
              ? [
                  // User: forest-emerald gradient, white text
                  "bg-gradient-to-br from-primary via-emerald-600 to-emerald-700",
                  "text-white rounded-tr-sm",
                  "shadow-primary/15 shadow-md",
                ]
              : [
                  // Bot: glassmorphism card
                  "backdrop-blur-md border",
                  "bg-white/75 border-black/06 text-foreground",
                  "dark:bg-white/06 dark:border-white/10 dark:text-card-foreground",
                  "rounded-tl-sm",
                  "shadow-black/04 dark:shadow-black/30",
                ]
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{content}</p>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-headings:font-semibold">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
                components={{
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside my-2 space-y-1 text-sm">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside my-2 space-y-1 text-sm">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground dark:text-card-foreground">
                      {children}
                    </strong>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-base font-bold mt-3 mb-1.5 first:mt-0">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-sm font-bold mt-3 mb-1 first:mt-0">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-semibold mt-2 mb-1 first:mt-0">{children}</h3>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-primary/40 pl-3 my-2 text-muted-foreground italic">
                      {children}
                    </blockquote>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary dark:text-emerald-400 underline underline-offset-2 hover:opacity-80 transition-opacity"
                    >
                      {children}
                    </a>
                  ),
                  code: ({ children, className }) => {
                    const isInline = !className
                    return (
                      <CodeBlock inline={isInline} className={className}>
                        {children}
                      </CodeBlock>
                    )
                  },
                  pre: ({ children }) => <>{children}</>,
                  hr: () => (
                    <hr className="my-3 border-black/08 dark:border-white/10" />
                  ),
                }}
              >
                {sanitizeResponse(content)}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Timestamp */}
        {formattedTime && (
          <span className="text-[10px] text-muted-foreground px-1 select-none">
            {formattedTime}
          </span>
        )}
      </div>
    </div>
  )
})

export { MessageBubble }
