import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react"
import { Header } from "./components/layout/Header"
import { Background3D } from "./components/layout/Background3D"

const ChatBot = lazy(() => import("./components/chat/ChatBot"))

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
    <div className="flex flex-col h-[100dvh] overflow-hidden relative bg-transparent">
      {/* 3D Volumetric Floating Background */}
      <Background3D />

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
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center bg-background/50 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground font-medium animate-pulse">
                    Loading assistant...
                  </p>
                </div>
              </div>
            }
          >
            <ChatBot goHomeRef={goHomeRef} />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export default App
