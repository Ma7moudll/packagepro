"use client"

import { useState } from "react"
import { useCollaborationStore } from "@/lib/collaboration/collaboration-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, X, Check } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { Comment } from "@/lib/collaboration/types"

export function CommentsPanel() {
  const { language } = useLanguage()
  const [open, setOpen] = useState(false)
  const comments = useCollaborationStore((s) => s.comments.filter((c) => !c.resolved))
  const addComment = useCollaborationStore((s) => s.addComment)
  const resolveComment = useCollaborationStore((s) => s.resolveComment)
  const selectedFace = useCollaborationStore((s) => s.roomId) // TODO: Get from design store

  const handleAddComment = (content: string, position: { x: number; y: number }) => {
    addComment({
      content,
      position,
      faceId: selectedFace || "front",
      resolved: false,
    })
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-20 right-4 rounded-full shadow-lg"
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
          {language === "ar" ? "التعليقات" : "Comments"} ({comments.length})
        </h3>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              {language === "ar" ? "لا توجد تعليقات" : "No comments"}
            </p>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onResolve={() => resolveComment(comment.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function CommentItem({ comment, onResolve }: { comment: Comment; onResolve: () => void }) {
  const { language } = useLanguage()

  return (
    <div className="p-3 bg-slate-50 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center">
            {comment.userName.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-medium">{comment.userName}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onResolve} className="h-6 w-6">
          <Check className="h-3 w-3" />
        </Button>
      </div>
      <p className="text-sm text-slate-700">{comment.content}</p>
      <p className="text-xs text-slate-500">
        {new Date(comment.timestamp).toLocaleString()}
      </p>
    </div>
  )
}

