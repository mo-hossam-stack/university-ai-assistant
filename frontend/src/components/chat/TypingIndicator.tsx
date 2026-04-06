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
    <div className={cn("flex gap-3 animate-slide-up", className)}>
      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-secondary">
        <Bot className="w-4 h-4 text-secondary-foreground" />
      </div>

      <div className="bg-secondary/80 rounded-2xl rounded-tl-sm border border-border/50 px-4 py-3">
        <div className="flex items-center gap-1.5">
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
