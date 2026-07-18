import { memo } from "react"
import { cn } from "@/lib/utils"
import { Bot } from "lucide-react"

interface TypingIndicatorProps {
  className?: string
}

const TypingIndicator = memo(function TypingIndicator({
  className,
}: TypingIndicatorProps) {
  return (
    <div
      className={cn("flex gap-2.5 animate-slide-up mt-1", className)}
      role="status"
      aria-label="Assistant is typing"
    >
      {/* Bot avatar — matches MessageBubble bot avatar */}
      <div
        className={cn(
          "flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl",
          "backdrop-blur-md border shadow-sm",
          "bg-white/60 border-black/08",
          "dark:bg-white/06 dark:border-white/10"
        )}
        aria-hidden="true"
      >
        <Bot className="w-4 h-4 text-primary dark:text-emerald-400" />
      </div>

      {/* Glass bubble */}
      <div
        className={cn(
          "rounded-2xl rounded-tl-sm px-4 py-3",
          "backdrop-blur-md border shadow-sm",
          "bg-white/75 border-black/06",
          "dark:bg-white/06 dark:border-white/10"
        )}
      >
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span
            className="w-2 h-2 rounded-full bg-primary/50 dark:bg-emerald-500/60 typing-dot"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="w-2 h-2 rounded-full bg-primary/50 dark:bg-emerald-500/60 typing-dot"
            style={{ animationDelay: "200ms" }}
          />
          <span
            className="w-2 h-2 rounded-full bg-primary/50 dark:bg-emerald-500/60 typing-dot"
            style={{ animationDelay: "400ms" }}
          />
        </div>

        {/* Screen-reader-only live announcement */}
        <span className="sr-only">Assistant is typing a response…</span>
      </div>
    </div>
  )
})

export default TypingIndicator
