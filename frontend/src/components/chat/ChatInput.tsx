import { memo, useCallback, useRef, type FormEvent, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"
import { Button } from "../ui/button"
import { SendHorizontal } from "lucide-react"

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading?: boolean
  disabled?: boolean
  maxLength?: number
}

const ChatInput = memo(function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  disabled = false,
  maxLength = 1000,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      if (newValue.length <= maxLength) {
        onChange(newValue)
        requestAnimationFrame(adjustHeight)
      }
    },
    [onChange, adjustHeight, maxLength]
  )

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (value.trim() && !isLoading && !disabled) {
        onSubmit()
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto"
        }
      }
    },
    [value, isLoading, disabled, onSubmit]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit(e as unknown as FormEvent)
      }
    },
    [handleSubmit]
  )

  return (
    <form onSubmit={handleSubmit} className="flex gap-2" id="chat-form">
      <div
        className={cn(
          "flex-1 flex items-center rounded-lg border bg-card px-3 py-2 transition-colors",
          "focus-within:border-primary focus-within:ring-1 focus-within:ring-primary",
          disabled && "opacity-50"
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={disabled || isLoading}
          rows={1}
          id="chat-input"
          className={cn(
            "flex-1 bg-transparent text-sm placeholder:text-muted-foreground",
            "focus:outline-none resize-none max-h-28"
          )}
          aria-label="Message input"
        />
        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
          {value.length}/{maxLength}
        </span>
      </div>

      <Button
        type="submit"
        disabled={!value.trim() || isLoading || disabled}
        className="px-4"
        aria-label="Send message"
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        ) : (
          <SendHorizontal className="w-4 h-4" />
        )}
      </Button>
    </form>
  )
})

export { ChatInput }
