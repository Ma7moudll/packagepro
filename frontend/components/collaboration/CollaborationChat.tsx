"use client"

import { useState, useRef, useEffect } from "react"
import { useCollaborationStore } from "@/lib/collaboration/collaboration-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, MessageSquare, X } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"

export function CollaborationChat() {
  const { language } = useLanguage()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const messages = useCollaborationStore((s) => s.messages)
  const sendMessage = useCollaborationStore((s) => s.sendMessage)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (!message.trim()) return
    sendMessage(message)
    setMessage("")
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 rounded-full shadow-lg"
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 h-96 bg-white rounded-lg border border-slate-200 shadow-xl flex flex-col z-50">
      <div className="flex items-center justify-between p-3 border-b border-slate-200">
        <h3 className="font-semibold text-sm">
          {language === "ar" ? "الدردشة" : "Chat"}
        </h3>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              {language === "ar" ? "لا توجد رسائل بعد" : "No messages yet"}
            </p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{msg.userName}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-slate-700">{msg.content}</p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-slate-200 flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          placeholder={language === "ar" ? "اكتب رسالة..." : "Type a message..."}
          className="flex-1"
        />
        <Button onClick={handleSend} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

