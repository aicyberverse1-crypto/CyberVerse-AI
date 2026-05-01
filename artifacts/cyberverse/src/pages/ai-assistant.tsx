import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useSendAiChatMessage } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, User, Trash2, Shield, Mail, Lock, Activity } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  displayText?: string;
}

const QUICK_PROMPTS = [
  { label: "Password tips", question: "What makes a truly secure password?", icon: Lock },
  { label: "Phishing signs", question: "How do I spot a phishing email?", icon: Mail },
  { label: "2FA benefits", question: "Why is two-factor authentication important?", icon: Shield },
  { label: "SQL injection", question: "What is SQL injection and how do I prevent it?", icon: Activity },
];

export default function AiAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "CyberGuard AI online. I'm your dedicated cybersecurity mentor. Ask me anything — from password best practices to advanced threat analysis. How can I assist your mission today?",
      timestamp: new Date(),
      displayText: "CyberGuard AI online. I'm your dedicated cybersecurity mentor. Ask me anything — from password best practices to advanced threat analysis. How can I assist your mission today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [typingIndex, setTypingIndex] = useState(-1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = useSendAiChatMessage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || sendMessage.isPending) return;
    setInput("");

    const userMsg: Message = { role: "user", content: msg, timestamp: new Date(), displayText: msg };
    setMessages(prev => [...prev, userMsg]);

    const assistantPlaceholder: Message = { role: "assistant", content: "", timestamp: new Date(), displayText: "" };
    setMessages(prev => {
      const next = [...prev, assistantPlaceholder];
      setTypingIndex(next.length - 1);
      return next;
    });

    sendMessage.mutate(
      { data: { message: msg } },
      {
        onSuccess: (data) => {
          const fullText = data.response;
          let idx = 0;
          const interval = setInterval(() => {
            idx++;
            setMessages(prev =>
              prev.map((m, i) => {
                if (i === prev.length - 1 && m.role === "assistant") {
                  return { ...m, content: fullText, displayText: fullText.slice(0, idx) };
                }
                return m;
              })
            );
            if (idx >= fullText.length) {
              clearInterval(interval);
              setTypingIndex(-1);
            }
          }, 15);
        },
        onError: () => {
          setMessages(prev => prev.slice(0, -1));
          setTypingIndex(-1);
        },
      }
    );
  }

  function handleClear() {
    setMessages([{
      role: "assistant",
      content: "CyberGuard AI online. Session reset. How can I assist you?",
      timestamp: new Date(),
      displayText: "CyberGuard AI online. Session reset. How can I assist you?",
    }]);
    setTypingIndex(-1);
  }

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">CyberGuard AI</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-muted-foreground">Active — Cybersecurity Expert</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs border-primary/30 text-primary">{messages.length - 1} messages</Badge>
          <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1.5 text-muted-foreground hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </Button>
        </div>
      </div>

      {/* Quick prompts */}
      <div className="flex gap-2 flex-wrap">
        {QUICK_PROMPTS.map((p) => (
          <Button
            key={p.label}
            variant="outline"
            size="sm"
            onClick={() => handleSend(p.question)}
            disabled={sendMessage.isPending}
            className="gap-1.5 text-xs border-border hover:border-primary/50 hover:text-primary"
          >
            <p.icon className="w-3 h-3" />
            {p.label}
          </Button>
        ))}
      </div>

      {/* Messages */}
      <Card className="flex-1 bg-card border-border overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted text-foreground rounded-tl-sm border border-border"
                }`}>
                  {msg.displayText ?? msg.content}
                  {idx === typingIndex && <span className="inline-block w-0.5 h-4 bg-current animate-pulse ml-0.5 -mb-0.5" />}
                </div>
                <span className="text-xs text-muted-foreground px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask CyberGuard about cybersecurity..."
            className="bg-background/50 border-muted focus-visible:ring-primary"
            disabled={sendMessage.isPending}
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || sendMessage.isPending}
            className="gap-2 bg-primary text-primary-foreground shrink-0"
          >
            <Send className="w-4 h-4" />
            {sendMessage.isPending ? "..." : "Send"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
