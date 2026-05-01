import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Bot } from "lucide-react";
import { useSendAiChatMessage } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

interface Message {
  role: "user" | "assistant";
  content: string;
  typing?: boolean;
}

export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "CyberGuard online. Ask me anything about cybersecurity or your current mission." }
  ]);
  const [displayedContent, setDisplayedContent] = useState<string[]>(["CyberGuard online. Ask me anything about cybersecurity or your current mission."]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [location] = useLocation();
  const gameMode = location.replace("/", "") || undefined;

  const sendMessage = useSendAiChatMessage({
    mutation: {
      onSuccess: (data) => {
        const fullText = data.response;
        setMessages(prev => [...prev, { role: "assistant", content: fullText, typing: true }]);
        
        let idx = 0;
        const interval = setInterval(() => {
          idx++;
          setDisplayedContent(prev => {
            const next = [...prev];
            next[next.length - 1] = fullText.slice(0, idx);
            return next;
          });
          if (idx >= fullText.length) {
            clearInterval(interval);
            setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, typing: false } : m));
          }
        }, 20);
      },
    },
  });

  useEffect(() => {
    if (messages.length > displayedContent.length) {
      setDisplayedContent(prev => [...prev, ""]);
    }
  }, [messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedContent]);

  function handleSend() {
    if (!input.trim() || sendMessage.isPending) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setDisplayedContent(prev => [...prev, userMsg]);
    sendMessage.mutate({ data: { message: userMsg, gameMode: gameMode !== "dashboard" ? gameMode : undefined } });
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="w-80 h-96 bg-card border border-primary/30 rounded-xl shadow-2xl shadow-primary/10 flex flex-col overflow-hidden"
          >
            <div className="flex items-center gap-2 p-3 border-b border-border bg-card/80">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">CyberGuard AI</span>
              <button
                onClick={() => setOpen(false)}
                className="ml-auto text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground border border-border"
                    }`}
                  >
                    {msg.role === "assistant" ? (displayedContent[idx] ?? "") : msg.content}
                    {msg.typing && <span className="animate-pulse ml-1">|</span>}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-border flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask CyberGuard..."
                className="text-xs bg-background/50 border-muted h-8"
              />
              <Button
                size="sm"
                onClick={handleSend}
                disabled={sendMessage.isPending || !input.trim()}
                className="h-8 px-2 bg-primary text-primary-foreground"
              >
                <Send className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center"
      >
        {open ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </motion.button>
    </div>
  );
}
