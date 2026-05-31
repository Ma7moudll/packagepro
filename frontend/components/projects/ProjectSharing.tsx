"use client"

import { useState, useEffect } from "react"
import { useProjectStore } from "@/lib/projects/project-store"
import { ProjectService } from "@/lib/projects/project-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Share2, UserPlus, X, Mail } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { ProjectShare } from "@/lib/projects/types"

interface ProjectSharingProps {
  projectId: string
}

export function ProjectSharing({ projectId }: ProjectSharingProps) {
  const { language } = useLanguage()
  const { getShares, addShare, removeShare } = useProjectStore()
  const projectService = new ProjectService()
  const [shares, setShares] = useState<ProjectShare[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadShares()
  }, [projectId])

  const loadShares = async () => {
    try {
      const projectShares = await projectService.getShares(projectId)
      setShares(projectShares)
    } catch (error) {
      console.error("Error loading shares:", error)
    }
  }

  const handleShare = async (userId: string, role: "viewer" | "editor" | "admin") => {
    try {
      setLoading(true)
      await projectService.shareProject(projectId, {
        userId,
        role,
        permissions: getPermissionsForRole(role),
      })
      await loadShares()
    } catch (error) {
      console.error("Error sharing project:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveShare = async (shareId: string) => {
    try {
      await projectService.removeShare(projectId, shareId)
      await loadShares()
    } catch (error) {
      console.error("Error removing share:", error)
    }
  }

  const getPermissionsForRole = (role: string): string[] => {
    switch (role) {
      case "admin":
        return ["view", "edit", "delete", "share", "comment", "approve"]
      case "editor":
        return ["view", "edit", "comment"]
      case "viewer":
        return ["view", "comment"]
      default:
        return []
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {language === "ar" ? "مشاركة المشروع" : "Project Sharing"}
          </CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                {language === "ar" ? "مشاركة" : "Share"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {language === "ar" ? "مشاركة المشروع" : "Share Project"}
                </DialogTitle>
              </DialogHeader>
              <ShareProjectForm onSubmit={handleShare} loading={loading} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {shares.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            {language === "ar" ? "لا توجد مشاركات" : "No shares yet"}
          </p>
        ) : (
          <div className="space-y-2">
            {shares.map((share) => (
              <div
                key={share.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-medium">
                    {share.userId.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{share.userId}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {share.role}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {new Date(share.sharedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveShare(share.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ShareProjectForm({
  onSubmit,
  loading,
}: {
  onSubmit: (userId: string, role: "viewer" | "editor" | "admin") => void
  loading: boolean
}) {
  const { language } = useLanguage()
  const [userId, setUserId] = useState("")
  const [role, setRole] = useState<"viewer" | "editor" | "admin">("viewer")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (userId.trim()) {
      onSubmit(userId.trim(), role)
      setUserId("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>
          {language === "ar" ? "معرّف المستخدم أو البريد الإلكتروني" : "User ID or Email"}
        </Label>
        <Input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="user@example.com"
          required
        />
      </div>
      <div>
        <Label>
          {language === "ar" ? "الدور" : "Role"}
        </Label>
        <Select value={role} onValueChange={(v) => setRole(v as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="viewer">
              {language === "ar" ? "عرض فقط" : "Viewer"}
            </SelectItem>
            <SelectItem value="editor">
              {language === "ar" ? "محرر" : "Editor"}
            </SelectItem>
            <SelectItem value="admin">
              {language === "ar" ? "مدير" : "Admin"}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? language === "ar"
            ? "جارٍ..."
            : "Loading..."
          : language === "ar"
            ? "مشاركة"
            : "Share"}
      </Button>
    </form>
  )
}

