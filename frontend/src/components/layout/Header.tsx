import { memo, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { Logo } from "../common/Logo"

interface HeaderProps {
  isDark: boolean
  onToggleTheme: () => void
  onLogoClick?: () => void
}

const Header = memo(function Header({ isDark, onToggleTheme, onLogoClick }: HeaderProps) {
  const [isThemeAnimating, setIsThemeAnimating] = useState(false)

  const handleThemeToggle = () => {
    setIsThemeAnimating(true)
    onToggleTheme()
    setTimeout(() => setIsThemeAnimating(false), 400)
  }

  return (
    <header
      className={cn(
        "flex-shrink-0 relative z-20",
        "border-b border-border/60",
        "bg-card/70 backdrop-blur-md",
        "transition-colors duration-300"
      )}
    >
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo & Brand — purely visual, not wrapped in a heading to avoid nesting issues */}
        <div className="flex items-center gap-3">
          {/* Clickable logo icon button — semantically correct */}
          <button
            type="button"
            onClick={onLogoClick}
            className={cn(
              "relative w-9 h-9 flex items-center justify-center flex-shrink-0",
              "hover:scale-105",
              "active:scale-95",
              "transition-all duration-200 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              // 44×44px minimum touch target (WCAG 2.5.5)
              "after:absolute after:-inset-1.5 after:content-[''] after:rounded-xl"
            )}
            aria-label="UniHelp AI — return to home"
          >
            <Logo size="sm" />
          </button>

          {/* Brand text — visually decorative, the aria-label on the button above conveys the meaning */}
          <div aria-hidden="true">
            <p className="text-base font-semibold text-foreground leading-tight font-display">
              UniHelp AI
            </p>
            <p className="text-xs text-muted-foreground leading-tight">
              Nahda University
            </p>
          </div>
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={handleThemeToggle}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={isDark}
          className={cn(
            "relative w-11 h-11 rounded-xl flex items-center justify-center",
            "text-muted-foreground",
            "hover:text-foreground hover:bg-accent",
            "active:scale-90",
            "transition-all duration-200 ease-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
        >
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-all duration-300",
              isDark
                ? "opacity-100 rotate-0 scale-100"
                : "opacity-0 rotate-90 scale-75"
            )}
          >
            <Sun className="w-4 h-4" aria-hidden="true" />
          </span>
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-all duration-300",
              !isDark
                ? "opacity-100 rotate-0 scale-100"
                : "opacity-0 -rotate-90 scale-75"
            )}
          >
            <Moon className="w-4 h-4" aria-hidden="true" />
          </span>

          {/* Animate ripple when toggling */}
          {isThemeAnimating && (
            <span
              className="absolute inset-0 rounded-xl bg-primary/10 animate-ping"
              aria-hidden="true"
            />
          )}
        </button>
      </div>
    </header>
  )
})

export { Header }
