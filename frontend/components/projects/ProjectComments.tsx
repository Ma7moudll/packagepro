"use client"

import { useState, useEffect } from "react"
import { useProjectStore } from "@/lib/projects/project-store"
import { ProjectService } from "@/lib/projects/project-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageSquare, Send, CheckCircle2, XCircle, Reply } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { useSession } from "next-auth/react"
import { ProjectComment } from "@/lib/projects/types"

interface ProjectCommentsProps {
  projectId: string
}

export function ProjectComments({ projectId }: ProjectCommentsProps) {
  const { language } = useLanguage()
  const { data: session } = useSession()
  const { getComments, addComment, updateComment } = useProjectStore()
  const projectService = new ProjectService()
  const [comments, setComments] = useState<ProjectComment[]>([])
  const [newComment, setNewComment] = useState("")
  const [commentType, setCommentType] = useState<"comment" | "feedback" | "suggestion">("comment")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadComments()
  }, [projectId])

  const loadComments = async () => {
    try {
      const projectComments = await projectService.getComments(projectId)
      setComments(projectComments)
    } catch (error) {
      console.error("Error loading comments:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !session?.user) return

    try {
      setLoading(true)
      await projectService.addComment(projectId, {
        userId: session.user.id || "",
        userName: session.user.name || "User",
        userAvatar: session.user.image || undefined,
        content: newComment.trim(),
        type: commentType,
        status: "open",
        replies: [],
        mentions: [],
        attachments: [],
      })
      setNewComment("")
      await loadComments()
    } catch (error) {
      console.error("Error adding comment:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async (commentId: string) => {
    try {
      await projectService.updateComment(projectId, commentId, {
        status: "resolved",
        resolvedAt: new Date().toISOString(),
        resolvedBy: session?.user?.id || "",
      })
      await loadComments()
    } catch (error) {
      console.error("Error resolving comment:", error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {language === "ar" ? "التعليقات والملاحظات" : "Comments & Feedback"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New Comment Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>
              {language === "ar" ? "نوع التعليق" : "Comment Type"}
            </Label>
            <Select value={commentType} onValueChange={(v) => setCommentType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comment">
                  {language === "ar" ? "تعليق" : "Comment"}
                </SelectItem>
                <SelectItem value="feedback">
                  {language === "ar" ? "ملاحظة" : "Feedback"}
                </SelectItem>
                <SelectItem value="suggestion">
                  {language === "ar" ? "اقتراح" : "Suggestion"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={language === "ar" ? "اكتب تعليقاً..." : "Write a comment..."}
              rows={3}
              required
            />
          </div>
          <Button type="submit" disabled={loading || !newComment.trim()}>
            <Send className="h-4 w-4 mr-2" />
            {language === "ar" ? "إرسال" : "Send"}
          </Button>
        </form>

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              {language === "ar" ? "لا توجد تعليقات" : "No comments yet"}
            </p>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onResolve={() => handleResolve(comment.id)}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function CommentItem({
  comment,
  onResolve,
}: {
  comment: ProjectComment
  onResolve: () => void
}) {
  const { language } = useLanguage()

  return (
    <div className={`p-3 rounded-lg border ${
      comment.status === "resolved" ? "bg-slate-50 opacity-75" : "bg-white"
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
            {comment.userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{comment.userName}</span>
              <Badge
                variant="outline"
                className={`text-xs ${
                  comment.type === "feedback"
                    ? "bg-yellow-50 text-yellow-700"
                    : comment.type === "suggestion"
                      ? "bg-blue-50 text-blue-700"
                      : ""
                }`}
              >
                {comment.type}
              </Badge>
              {comment.status === "resolved" && (
                <Badge variant="secondary" className="text-xs">
                  {language === "ar" ? "محلول" : "Resolved"}
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-700">{comment.content}</p>
            <p className="text-xs text-slate-500 mt-1">
              {new Date(comment.createdAt).toLocaleString()}
            </p>
            {comment.replies.length > 0 && (
              <div className="mt-3 ml-4 space-y-2 border-l-2 border-slate-200 pl-3">
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="text-sm">
                    <span className="font-medium">{reply.userName}:</span> {reply.content}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {comment.status === "open" && (
          <Button variant="ghost" size="icon" onClick={onResolve}>
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

