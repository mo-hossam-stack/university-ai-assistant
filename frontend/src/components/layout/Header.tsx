import { memo } from "react"
import { Button } from "../ui/button"
import { Moon, Sun, Bot } from "lucide-react"

interface HeaderProps {
  isDark: boolean
  onToggleTheme: () => void
  onLogoClick?: () => void
}

const Header = memo(function Header({ isDark, onToggleTheme, onLogoClick }: HeaderProps) {
  return (
    <header className="border-b bg-card">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <button
          onClick={onLogoClick}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          aria-label="Go to home"
        >
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">
              UniHelp AI
            </h1>
            <p className="text-xs text-muted-foreground">
              Nahda University
            </p>
          </div>
        </button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </Button>
      </div>
    </header>
  )
})

export { Header }
