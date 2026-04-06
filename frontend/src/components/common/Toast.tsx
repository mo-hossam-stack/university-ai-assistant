import { memo, useEffect, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { AlertCircle, X } from "lucide-react"

type ToastType = "error" | "success" | "info"

interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  onClose: () => void
  className?: string
}

const styles = {
  error: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200",
  success: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-200",
  info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200",
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

  return (
    <div
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
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <p className="text-sm flex-1">{message}</p>
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
})

export { Toast }
