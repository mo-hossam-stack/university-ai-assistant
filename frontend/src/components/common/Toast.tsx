import { memo, useEffect, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react"

type ToastType = "error" | "success" | "info"

interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  onClose: () => void
  className?: string
}

const styles: Record<ToastType, string> = {
  error:
    "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200",
  success:
    "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-200",
  info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200",
}

/** Map each toast type to a distinctive icon */
const icons: Record<ToastType, React.ElementType> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
}

const Toast = memo(function Toast({
  message,
  type = "error",
  duration = 4000,
  onClose,
  className,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  const handleClose = useCallback(() => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }, [onClose])

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true))
    const timer = setTimeout(handleClose, duration)
    return () => clearTimeout(timer)
  }, [duration, handleClose])

  const Icon = icons[type]

  return (
    /*
     * role="alert" makes this an implicit aria-live="assertive" region.
     * Screen readers will interrupt the current announcement to read the
     * toast content \u2014 appropriate for errors and important status messages
     * (WCAG 4.1.3 Status Messages).
     */
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        "fixed bottom-24 left-4 right-4 z-50 max-w-md mx-auto",
        "transition-all duration-300",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border p-3 shadow-lg",
          styles[type]
        )}
      >
        {/* Type-specific icon, decorative \u2014 message text conveys the meaning */}
        <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        <p className="text-sm flex-1">{message}</p>
        {/*
          Close button: min 44\u00d744px touch target on mobile (WCAG 2.5.5).
          The negative margin on smaller screens keeps the visual size compact
          while expanding the actual tappable area.
        */}
        <button
          onClick={handleClose}
          type="button"
          className={cn(
            "flex-shrink-0 flex items-center justify-center",
            "min-w-[44px] min-h-[44px] -m-2",
            "rounded-md",
            "hover:bg-black/10 dark:hover:bg-white/10",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          )}
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
})

export { Toast }
