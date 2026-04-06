import * as React from "react"
import { cn } from "@/lib/utils"

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, ...props }, ref) => {
    return (
      <div className={cn("relative", containerClassName)}>
        <textarea
          className={cn(
            "flex min-h-[60px] w-full rounded-xl border-2 border-input bg-transparent px-4 py-3 text-base transition-all duration-200",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "resize-none",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
