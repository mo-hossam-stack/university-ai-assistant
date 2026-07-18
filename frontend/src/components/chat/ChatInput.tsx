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
    /*
     * <form> with aria-label provides an accessible landmark for the
     * input region. The <label> element links explicitly to the textarea
     * via htmlFor/id, satisfying WCAG 1.3.1 (Info and Relationships).
     */
    <form
      onSubmit={handleSubmit}
      className="flex gap-2"
      id="chat-form"
      aria-label="Send a message"
    >
      <div
        className={cn(
          "flex-1 flex items-center rounded-lg border bg-card px-3 py-2 transition-colors",
          "focus-within:border-primary focus-within:ring-1 focus-within:ring-primary",
          disabled && "opacity-50"
        )}
      >
        {/* Visually hidden label — links textarea to its accessible name */}
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={disabled || isLoading}
          rows={1}
          id="chat-input"
          aria-describedby="char-counter"
          aria-label={undefined} /* label element is used instead */
          className={cn(
            "flex-1 bg-transparent text-sm placeholder:text-muted-foreground",
            "focus:outline-none resize-none max-h-28"
          )}
        />
        {/* Character counter — referenced by textarea’s aria-describedby */}
        <span
          id="char-counter"
          className="text-[10px] text-muted-foreground whitespace-nowrap ml-2"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="sr-only">Characters used: </span>
          {value.length}/{maxLength}
        </span>
      </div>

      {/*
        Send button: min 44×44px touch target (WCAG 2.5.5).
        aria-label describes the action; icon is purely decorative.
      */}
      <Button
        type="submit"
        disabled={!value.trim() || isLoading || disabled}
        className="min-h-[44px] min-w-[44px] px-4"
        aria-label={isLoading ? "Sending message…" : "Send message"}
        aria-busy={isLoading}
      >
        {isLoading ? (
          <div
            className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin"
            aria-hidden="true"
          />
        ) : (
          <SendHorizontal className="w-4 h-4" aria-hidden="true" />
        )}
      </Button>
    </form>
  )
})

export { ChatInput }
