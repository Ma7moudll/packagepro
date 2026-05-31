"use client"

import { useState, useCallback } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { useLanguage } from "@/providers/language-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  MessageSquare,
  Send,
  X,
  Check,
  Reply,
  MoreHorizontal,
  Pin,
  Trash2,
  Clock,
} from "lucide-react"

interface Comment {
  id: string
  authorName: string
  authorInitials: string
  content: string
  timestamp: Date
  resolved: boolean
  replies: Comment[]
  position?: { x: number; y: number }
  faceId?: string
}

// Sample comments for demo
const SAMPLE_COMMENTS: Comment[] = [
  {
    id: "1",
    authorName: "Ahmed",
    authorInitials: "أ",
    content: "يجب تكبير الشعار قليلاً",
    timestamp: new Date(Date.now() - 3600000),
    resolved: false,
    replies: [
      {
        id: "1-1",
        authorName: "Sara",
        authorInitials: "س",
        content: "تم تكبيره، هل هذا مناسب؟",
        timestamp: new Date(Date.now() - 1800000),
        resolved: false,
        replies: [],
      },
    ],
    position: { x: 200, y: 150 },
    faceId: "front",
  },
  {
    id: "2",
    authorName: "Mohamed",
    authorInitials: "م",
    content: "اللون الأخضر يحتاج تعديل",
    timestamp: new Date(Date.now() - 7200000),
    resolved: true,
    replies: [],
    position: { x: 350, y: 250 },
    faceId: "front",
  },
]

export function CommentsPanel() {
  const { language } = useLanguage()
  const [comments, setComments] = useState<Comment[]>(SAMPLE_COMMENTS)
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all")

  const selectedFace = useDesignStore((s) => s.ui.selectedFace)

  // Filter comments
  const filteredComments = comments.filter((comment) => {
    if (filter === "open") return !comment.resolved
    if (filter === "resolved") return comment.resolved
    return true
  })

  // Add new comment
  const handleAddComment = useCallback(() => {
    if (!newComment.trim()) return

    const comment: Comment = {
      id: Date.now().toString(),
      authorName: language === "ar" ? "أنت" : "You",
      authorInitials: language === "ar" ? "أ" : "Y",
      content: newComment,
      timestamp: new Date(),
      resolved: false,
      replies: [],
      faceId: selectedFace,
    }

    setComments([comment, ...comments])
    setNewComment("")
  }, [newComment, comments, selectedFace, language])

  // Add reply
  const handleAddReply = useCallback(
    (commentId: string) => {
      if (!replyText.trim()) return

      const reply: Comment = {
        id: `${commentId}-${Date.now()}`,
        authorName: language === "ar" ? "أنت" : "You",
        authorInitials: language === "ar" ? "أ" : "Y",
        content: replyText,
        timestamp: new Date(),
        resolved: false,
        replies: [],
      }

      setComments(
        comments.map((c) =>
          c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c
        )
      )
      setReplyText("")
      setReplyingTo(null)
    },
    [replyText, comments, language]
  )

  // Toggle resolved
  const toggleResolved = useCallback(
    (commentId: string) => {
      setComments(
        comments.map((c) =>
          c.id === commentId ? { ...c, resolved: !c.resolved } : c
        )
      )
    },
    [comments]
  )

  // Delete comment
  const deleteComment = useCallback(
    (commentId: string) => {
      setComments(comments.filter((c) => c.id !== commentId))
    },
    [comments]
  )

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return language === "ar" ? "الآن" : "Just now"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60)
      return language === "ar" ? `منذ ${minutes} دقيقة` : `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24)
      return language === "ar" ? `منذ ${hours} ساعة` : `${hours}h ago`
    const days = Math.floor(hours / 24)
    return language === "ar" ? `منذ ${days} يوم` : `${days}d ago`
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-slate-600" />
            <h3 className="text-sm font-semibold">
              {language === "ar" ? "التعليقات" : "Comments"}
            </h3>
            <span className="text-xs text-slate-400">
              ({comments.filter((c) => !c.resolved).length}{" "}
              {language === "ar" ? "مفتوحة" : "open"})
            </span>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-1">
          {[
            { id: "all" as const, label: { en: "All", ar: "الكل" } },
            { id: "open" as const, label: { en: "Open", ar: "مفتوحة" } },
            { id: "resolved" as const, label: { en: "Resolved", ar: "محلولة" } },
          ].map((f) => (
            <Button
              key={f.id}
              variant={filter === f.id ? "secondary" : "ghost"}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setFilter(f.id)}
            >
              {language === "ar" ? f.label.ar : f.label.en}
            </Button>
          ))}
        </div>
      </div>

      {/* New Comment Input */}
      <div className="p-4 border-b">
        <div className="flex gap-2">
          <Textarea
            placeholder={language === "ar" ? "أضف تعليقاً..." : "Add a comment..."}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="text-xs min-h-[60px] resize-none"
          />
        </div>
        <div className="flex justify-end mt-2">
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={handleAddComment}
            disabled={!newComment.trim()}
          >
            <Send className="h-3 w-3 mr-1" />
            {language === "ar" ? "إرسال" : "Send"}
          </Button>
        </div>
      </div>

      {/* Comments List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {filteredComments.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {language === "ar" ? "لا توجد تعليقات" : "No comments yet"}
              </p>
            </div>
          ) : (
            filteredComments.map((comment) => (
              <div
                key={comment.id}
                className={`p-3 rounded-lg border ${
                  comment.resolved
                    ? "bg-slate-50 border-slate-200"
                    : "bg-white border-slate-200"
                }`}
              >
                {/* Comment Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] bg-slate-200">
                        {comment.authorInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-semibold">{comment.authorName}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTimeAgo(comment.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => toggleResolved(comment.id)}
                      title={comment.resolved ? "Reopen" : "Resolve"}
                    >
                      <Check
                        className={`h-3 w-3 ${
                          comment.resolved ? "text-emerald-500" : "text-slate-400"
                        }`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-400 hover:text-red-500"
                      onClick={() => deleteComment(comment.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Comment Content */}
                <p
                  className={`text-xs mb-2 ${
                    comment.resolved ? "text-slate-400 line-through" : "text-slate-700"
                  }`}
                >
                  {comment.content}
                </p>

                {/* Replies */}
                {comment.replies.length > 0 && (
                  <div className="ml-4 mt-3 space-y-2 border-l-2 border-slate-100 pl-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="text-xs">
                        <div className="flex items-center gap-1 mb-1">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[8px] bg-slate-100">
                              {reply.authorInitials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold">{reply.authorName}</span>
                          <span className="text-slate-400">
                            {formatTimeAgo(reply.timestamp)}
                          </span>
                        </div>
                        <p className="text-slate-600">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Input */}
                {replyingTo === comment.id ? (
                  <div className="mt-3 flex gap-2">
                    <Input
                      placeholder={language === "ar" ? "رد..." : "Reply..."}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="text-xs h-7"
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleAddReply(comment.id)
                      }
                    />
                    <Button
                      size="sm"
                      className="h-7 text-[10px]"
                      onClick={() => handleAddReply(comment.id)}
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[10px]"
                      onClick={() => setReplyingTo(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] mt-2"
                    onClick={() => setReplyingTo(comment.id)}
                  >
                    <Reply className="h-3 w-3 mr-1" />
                    {language === "ar" ? "رد" : "Reply"}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
