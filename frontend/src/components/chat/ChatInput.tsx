import { memo, useCallback, useRef, type FormEvent, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"
import { Button } from "../ui/button"

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
      className="flex gap-2.5 items-end"
      id="chat-form"
      aria-label="Send a message"
    >
      <div
        className={cn(
          "flex-1 flex items-center rounded-2xl border border-border/80 bg-secondary/30 px-4 py-2.5 transition-all duration-300 ease-out",
          "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 focus-within:bg-secondary/40 focus-within:shadow-md focus-within:shadow-primary/5",
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
            "flex-1 bg-transparent text-sm sm:text-base placeholder:text-muted-foreground/60 text-foreground",
            "focus:outline-none resize-none max-h-28 pr-2"
          )}
          style={{ minHeight: "24px" }}
        />
        {/* Character counter — referenced by textarea’s aria-describedby */}
        <span
          id="char-counter"
          className="text-[10px] text-muted-foreground/80 whitespace-nowrap ml-2 self-end mb-0.5"
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
        className={cn(
          "min-h-[44px] min-w-[44px] size-11 rounded-2xl flex items-center justify-center p-0 flex-shrink-0 group",
          "bg-primary text-primary-foreground hover:bg-primary/95",
          "shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30",
          "hover:-translate-y-0.5 active:translate-y-0 active:scale-95",
          "transition-all duration-200 ease-out"
        )}
        aria-label={isLoading ? "Sending message…" : "Send message"}
        aria-busy={isLoading}
      >
        {isLoading ? (
          <div
            className="w-4.5 h-4.5 border-2 border-current/30 border-t-current rounded-full animate-spin"
            aria-hidden="true"
          />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4.5 h-4.5 transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-active:translate-x-0 group-active:translate-y-0"
            aria-hidden="true"
          >
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        )}
      </Button>
    </form>
  )
})

export { ChatInput }
