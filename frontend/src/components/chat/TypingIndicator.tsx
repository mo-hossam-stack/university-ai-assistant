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
    /*
     * role="status" is an implicit aria-live="polite" region.
     * The visually-hidden span inside it will be announced by screen readers
     * when this component mounts \u2014 satisfying WCAG 4.1.3 Status Messages.
     */
    <div
      role="status"
      aria-label="Assistant is typing"
      className={cn("flex gap-3 animate-slide-up", className)}
    >
      {/* Decorative bot avatar \u2014 the role/aria-label above conveys semantics */}
      <div
        className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-secondary"
        aria-hidden="true"
      >
        <Bot className="w-4 h-4 text-secondary-foreground" aria-hidden="true" />
      </div>

      <div className="bg-secondary/80 rounded-2xl rounded-tl-sm border border-border/50 px-4 py-3">
        {/* Visually hidden text for screen readers */}
        <span className="sr-only">Assistant is typing\u2026</span>

        {/* Animated dots \u2014 purely decorative, hidden from the a11y tree */}
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span
            className="w-2 h-2 rounded-full bg-muted-foreground/60 typing-dot"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="w-2 h-2 rounded-full bg-muted-foreground/60 typing-dot"
            style={{ animationDelay: "200ms" }}
          />
          <span
            className="w-2 h-2 rounded-full bg-muted-foreground/60 typing-dot"
            style={{ animationDelay: "400ms" }}
          />
        </div>
      </div>
    </div>
  )
})

export default TypingIndicator
