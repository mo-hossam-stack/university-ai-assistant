import { memo, useCallback, useRef, type FormEvent, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"
import { SendHorizontal, Loader2 } from "lucide-react"

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
      // max 5 lines ≈ 120px
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

  const hasText = value.trim().length > 0
  const nearLimit = value.length > 800
  const remaining = maxLength - value.length

  return (
    <div className="flex flex-col gap-1">
      <form
        onSubmit={handleSubmit}
        id="chat-form"
        className={cn(
          // Glass pill container
          "flex items-end gap-2 rounded-2xl border px-4 py-3",
          "backdrop-blur-md transition-all duration-300",
          // Light mode
          "bg-white/80 border-black/08",
          // Dark mode
          "dark:bg-white/05 dark:border-white/10",
          // Focus-within state: emerald glow ring
          "focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_var(--ring)/0.12]",
          // Focus-within dark mode
          "dark:focus-within:border-primary/30 dark:focus-within:shadow-[0_0_0_3px_var(--ring)/0.08]",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        {/* Textarea — grows up to 5 lines */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message… (Shift+Enter for new line)"
          disabled={disabled || isLoading}
          rows={1}
          id="chat-input"
          className={cn(
            "flex-1 bg-transparent text-sm placeholder:text-muted-foreground",
            "focus:outline-none resize-none max-h-[120px]",
            "leading-relaxed py-0.5"
          )}
          aria-label="Message input"
          aria-describedby={nearLimit ? "char-counter" : undefined}
        />

        {/* Send button — nested inside pill */}
        <button
          type="submit"
          disabled={!hasText || isLoading || disabled}
          aria-label="Send message"
          className={cn(
            // Base: circular pill
            "flex-shrink-0 flex items-center justify-center rounded-full",
            "w-9 h-9 transition-all duration-300",
            // Spring scale + transform
            "active:scale-90",
            // State: has text => emerald CTA with glow
            hasText && !isLoading
              ? [
                  "bg-primary text-white",
                  "shadow-md shadow-primary/25",
                  "scale-100 opacity-100",
                  "hover:shadow-lg hover:shadow-primary/30 hover:scale-105",
                ]
              : isLoading
              ? [
                  "bg-primary/20 text-primary dark:text-emerald-400",
                  "scale-100 opacity-80",
                ]
              : [
                  // No text => muted ghost state
                  "bg-muted text-muted-foreground",
                  "opacity-50 scale-90",
                ],
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <SendHorizontal className="w-4 h-4" />
          )}
        </button>
      </form>

      {/* Character counter — fades in only above 800 chars */}
      <div
        id="char-counter"
        aria-live="polite"
        className={cn(
          "flex justify-end px-1 text-[10px] transition-all duration-300",
          nearLimit
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-1 pointer-events-none",
          remaining < 100
            ? "text-destructive"
            : remaining < 200
            ? "text-amber-500 dark:text-amber-400"
            : "text-muted-foreground"
        )}
      >
        {remaining} characters remaining
      </div>
    </div>
  )
})

export { ChatInput }
