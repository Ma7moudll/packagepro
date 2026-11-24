"use client"

import { usePathname } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MessageCircle, X, Send, Phone, Mail } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"

export function LiveChat() {
  const pathname = usePathname()
  const editor = pathname === "/editor" || pathname.startsWith("/editor/")
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Array<{ text: string; sender: "user" | "agent"; time: string }>>([])
  const { isRTL } = useLanguage()

  const sendMessage = () => {
    if (!message.trim()) return

    const newMessage = {
      text: message,
      sender: "user" as const,
      time: new Date().toLocaleTimeString(),
    }

    setMessages([...messages, newMessage])
    setMessage("")

    // Simulate agent response
    setTimeout(() => {
      const agentResponse = {
        text: isRTL
          ? "شكراً لتواصلك معنا. كيف يمكنني مساعدتك اليوم؟"
          : "Thank you for contacting us. How can I help you today?",
        sender: "agent" as const,
        time: new Date().toLocaleTimeString(),
      }
      setMessages((prev) => [...prev, agentResponse])
    }, 1000)
  }

  if (pathname === "/receiving") return null

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        aria-label={isRTL ? "فتح الدعم" : "Open support"}
        className={`fixed ${editor ? "bottom-16 lg:right-80" : "bottom-4"} right-4 z-40 rounded-full w-14 h-14 shadow-lg`}
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 h-96 shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{isRTL ? "الدعم المباشر" : "Live Support"}</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-6 w-6">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm">
              {isRTL ? "مرحباً! كيف يمكنني مساعدتك؟" : "Hello! How can I help you?"}
            </div>
          )}
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`chat-bubble p-2 rounded-lg text-sm ${msg.sender === "user"
                  ? "bg-primary text-primary-foreground ml-auto max-w-[80%]"
                  : "bg-muted mr-auto max-w-[80%]"
                }`}
            >
              <div>{msg.text}</div>
              <div className="text-xs opacity-80 mt-1">{msg.time}</div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isRTL ? "اكتب رسالتك..." : "Type your message..."}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1"
            />
            <Button onClick={sendMessage} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1">
              <Phone className="h-4 w-4 mr-2" />
              {isRTL ? "اتصال" : "Call"}
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <Mail className="h-4 w-4 mr-2" />
              {isRTL ? "إيميل" : "Email"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
