import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react"
import { MessageBubble } from "./MessageBubble"
import { WelcomeScreen } from "./WelcomeScreen"
import { ChatInput } from "./ChatInput"
import TypingIndicator from "./TypingIndicator"
import { Toast } from "../common/Toast"
import { promptOpenai } from "@/lib/services/api"
import { sanitizeInput } from "@/lib/utils"
import { ArrowLeft, Trash2 } from "lucide-react"
import { Button } from "../ui/button"

interface Message {
  id: string
  content: string
  role: "user" | "bot"
  timestamp: Date
}

interface ToastState {
  message: string
  type: "error" | "success" | "info"
  key: number
}

interface ChatBotProps {
  goHomeRef?: MutableRefObject<(() => void) | null>
}

const MAX_MESSAGES = 50

const ChatBot = ({ goHomeRef }: ChatBotProps) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [prompt, setPrompt] = useState("")
  const [isBotTyping, setIsBotTyping] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [showWelcome, setShowWelcome] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (goHomeRef) {
      goHomeRef.current = handleGoHome
    }
  }, [goHomeRef])

  const hasMessages = messages.length > 0

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  useEffect(() => {
    if (hasMessages) {
      scrollToBottom()
    }
  }, [messages, hasMessages, scrollToBottom])

  const showToast = useCallback((message: string, type: ToastState["type"] = "error") => {
    setToast({ message, type, key: Date.now() })
  }, [])

  const hideToast = useCallback(() => {
    setToast(null)
  }, [])

  const handleGoHome = useCallback(() => {
    setShowWelcome(true)
    setMessages([])
    setPrompt("")
  }, [])

  const handleBack = useCallback(() => {
    handleGoHome()
  }, [handleGoHome])

  const handleClearChat = useCallback(() => {
    handleGoHome()
    showToast("Chat cleared", "success")
  }, [handleGoHome, showToast])

  const sendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || isBotTyping) return

      setShowWelcome(false)

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        content: sanitizeInput(messageText),
        role: "user",
        timestamp: new Date(),
      }

      setMessages((prev) => {
        const newMessages = [...prev, userMessage]
        if (newMessages.length > MAX_MESSAGES) {
          return newMessages.slice(-MAX_MESSAGES)
        }
        return newMessages
      })

      setPrompt("")
      setIsBotTyping(true)
      scrollToBottom("instant")

      try {
        const response = await promptOpenai({ message: messageText })

        const botMessage: Message = {
          id: `bot-${Date.now()}`,
          content: response.response,
          role: "bot",
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, botMessage])
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Something went wrong"
        showToast(errorMessage, "error")
      } finally {
        setIsBotTyping(false)
        scrollToBottom()
      }
    },
    [isBotTyping, showToast, scrollToBottom]
  )

  const handleSubmit = useCallback(() => {
    if (prompt.trim()) {
      sendMessage(prompt)
    }
  }, [prompt, sendMessage])

  const handleSelectTopic = useCallback(
    (topic: string) => {
      sendMessage(topic)
    },
    [sendMessage]
  )

  return (
    <div className="flex flex-col h-full bg-background">
      {hasMessages && !showWelcome && (
        <div className="flex items-center justify-between px-4 py-2 border-b bg-card flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <span className="text-sm text-muted-foreground">
            {messages.length} message{messages.length !== 1 ? "s" : ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            className="text-muted-foreground hover:text-destructive gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {showWelcome && !hasMessages && !isBotTyping && (
            <WelcomeScreen onSelectTopic={handleSelectTopic} />
          )}

          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                content={message.content}
                role={message.role}
                timestamp={message.timestamp}
              />
            ))}
          </div>

          {isBotTyping && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="flex-shrink-0 border-t bg-card px-4 py-3 safe-area-bottom">
        <div className="max-w-2xl mx-auto">
          <ChatInput
            value={prompt}
            onChange={setPrompt}
            onSubmit={handleSubmit}
            isLoading={isBotTyping}
            maxLength={1000}
          />
        </div>
      </div>

      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  )
}

export default ChatBot
