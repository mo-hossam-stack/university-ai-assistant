import { memo, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import { cn } from "@/lib/utils"
import { Bot, User } from "lucide-react"

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
    /*
     * Each message is an article with a descriptive aria-label that
     * combines the sender role and the timestamp, giving screen reader
     * users full context without relying on visual layout alone.
     */
    <div
      className={cn(
        "flex gap-2 w-full animate-slide-up",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
      role="article"
      aria-label={`${isUser ? "You" : "Assistant"}${formattedTime ? ` at ${formattedTime}` : ""}`}
    >
      {/* Avatar icon — decorative, sender identified by aria-label above */}
      <div
        className={cn(
          "flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg",
          isUser ? "bg-primary" : "bg-secondary"
        )}
        aria-hidden="true"
      >
        {isUser ? (
          <User className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
        ) : (
          <Bot className="w-4 h-4 text-secondary-foreground" aria-hidden="true" />
        )}
      </div>

      <div
        className={cn(
          "flex flex-col gap-1 max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-secondary text-secondary-foreground rounded-tl-sm"
          )}
        >
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
              components={{
                p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside my-1 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside my-1 space-y-0.5">{children}</ol>,
                code: ({ children }) => (
                  <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-xs">
                    {children}
                  </code>
                ),
              }}
            >
              {sanitizeResponse(content)}
            </ReactMarkdown>
          </div>
        </div>
        {formattedTime && (
          /*
           * aria-hidden hides the visible timestamp from the a11y tree
           * because the timestamp is already included in the parent
           * article’s aria-label. Prevents double-announcement.
           */
          <time
            aria-hidden="true"
            className="text-[10px] text-muted-foreground px-1"
          >
            {formattedTime}
          </time>
        )}
      </div>
    </div>
  )
})

export { MessageBubble }
