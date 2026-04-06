import { useState, useEffect, useCallback, useRef } from "react"
import ChatBot from "./components/chat/ChatBot"
import { Header } from "./components/layout/Header"

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
    <div className="flex flex-col h-screen bg-background">
      <Header isDark={isDark} onToggleTheme={toggleTheme} onLogoClick={handleLogoClick} />
      <main className="flex-1 overflow-hidden">
        <ChatBot goHomeRef={goHomeRef} />
      </main>
    </div>
  )
}

export default App
