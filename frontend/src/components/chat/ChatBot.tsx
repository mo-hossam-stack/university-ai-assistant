import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import popSound from "@/assets/sounds/Pop.mp3";
import notificationSound from "@/assets/sounds/Notify.mp3";
import ReactMarkdown from "react-markdown";
import { Button } from "../ui/button";
import { FaArrowUp } from "react-icons/fa";
import TypingIndicator from "./TypingIndicator";
import { promptOpenai } from "@/lib/services/api";

// Initialize audio
const popAudio = new Audio(popSound);
popAudio.volume = 0.2;

const notificationAudio = new Audio(notificationSound);
notificationAudio.volume = 0.2;

// Message interface
interface Message {
  content: string;
  role: "user" | "bot";
}

const ChatBot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [error, setError] = useState("");
  const lastMessageRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({behavior: "smooth"})
  }, [messages])

  function passPrompt(){
    setMessages((curr) => [...curr, { content: prompt, role: "user" }]);
    handlePromptOpenai()
    setPrompt("")
    popAudio.play()
  }

  function handlePrompting(e: React.FormEvent) {
    e.preventDefault();
    passPrompt()

    
    
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      passPrompt()
    }
  };


  async function handlePromptOpenai(){
    setIsBotTyping(true)
    try{
        const response = await promptOpenai({message: prompt})
        console.log(response)
        setMessages(curr => [...curr, {content: response.response, role: "bot"}])
        setError("")
        notificationAudio.play()
    }
    catch(err: unknown){
        if(err instanceof Error ){
            setError(err.message)
        }
    }
    finally{
        setIsBotTyping(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages container */}
      <div className="flex flex-col flex-1 gap-3 mb-10 overflow-y-auto">
        <div className="flex flex-col gap-3">
          {messages.map((message, index) => (
            <div
              key={index}
              ref={index === messages.length - 1 ? lastMessageRef : null}
              className={`px-3 py-1 max-w-md rounded-xl ${
                message.role === "user"
                  ? "bg-blue-600 text-white self-end"
                  : "bg-gray-100 text-black self-start"
              }`}
            >
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          ))}
        </div>

        {isBotTyping && <TypingIndicator />}
        {error && <p className="text-red-500">{error}</p>}
      </div>

      {/* Input area */}
      <form
        className="flex flex-col gap-2 items-end border-2 p-4 rounded-3xl"
        onSubmit={handlePrompting}
        onKeyDown={handleKeyDown}
      >
        <textarea
          className="w-full border-0 focus:outline-0 resize-none"
          placeholder="Ask anything"
          maxLength={1000}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          autoFocus
        />
        <Button
          disabled={prompt.trim().length < 1}
          className="rounded-full w-9 h-9"
        >
          <FaArrowUp />
        </Button>
      </form>
    </div>
  );
};

export default ChatBot;
