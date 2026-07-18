import { useState, useEffect, useCallback, useRef } from "react"
import ChatBot from "./components/chat/ChatBot"
import { Header } from "./components/layout/Header"

/**
 * SkipToContent — the very first focusable element on the page.
 * Visually hidden until keyboard-focused, then jumps to #main-content.
 * Satisfies WCAG 2.4.1 "Bypass Blocks".
 */
const SkipToContent = () => (
  <a
    href="#main-content"
    className={
      "sr-only focus:not-sr-only " +
      "focus:fixed focus:top-2 focus:left-2 focus:z-[100] " +
      "focus:rounded-md focus:bg-primary focus:text-primary-foreground " +
      "focus:px-4 focus:py-2 focus:text-sm focus:font-medium " +
      "focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    }
  >
    Skip to main content
  </a>
)

const App = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme")
      if (saved) return saved === "dark"
      return window.matchMedia("(prefers-color-scheme: dark)").matches
    }
    return false
  })

  const goHomeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    localStorage.setItem("theme", isDark ? "dark" : "light")
  }, [isDark])

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev)
  }, [])

  const handleLogoClick = useCallback(() => {
    if (goHomeRef.current) {
      goHomeRef.current()
    }
  }, [])

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden relative bg-background">
      {/* Ambient mesh background — fixed, non-scrollable */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        {/* Top-left emerald blob */}
        <div
          className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full opacity-60 animate-mesh-blob-1"
          style={{
            background: "radial-gradient(circle, var(--bg-mesh-a) 0%, transparent 70%)",
          }}
        />
        {/* Bottom-right violet blob */}
        <div
          className="absolute -bottom-40 -right-40 w-[560px] h-[560px] rounded-full opacity-50 animate-mesh-blob-2"
          style={{
            background: "radial-gradient(circle, var(--bg-mesh-b) 0%, transparent 70%)",
          }}
        />
        {/* Center accent blob */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-30 animate-mesh-blob-3"
          style={{
            background: "radial-gradient(circle, var(--bg-mesh-a) 0%, transparent 60%)",
          }}
        />
      </div>

      {/* App Shell */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Skip-nav: rendered before everything so it is the first tab stop */}
        <SkipToContent />
        <Header isDark={isDark} onToggleTheme={toggleTheme} onLogoClick={handleLogoClick} />
        {/* id="main-content" is the skip-nav anchor target; tabIndex={-1} lets
            focus() be called programmatically without a visible focus ring */}
        <main
          id="main-content"
          className="flex-1 overflow-hidden"
          tabIndex={-1}
          aria-label="Chat interface"
        >
          <ChatBot goHomeRef={goHomeRef} />
        </main>
      </div>
    </div>
  )
}

export default App
