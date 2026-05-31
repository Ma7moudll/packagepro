"use client"

import { useState, useEffect } from "react"
import { useProjectStore } from "@/lib/projects/project-store"
import { ProjectService } from "@/lib/projects/project-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { History, RotateCcw, Plus, Download } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { ProjectVersion } from "@/lib/projects/types"

interface ProjectVersioningProps {
  projectId: string
  onVersionChange?: () => void
}

export function ProjectVersioning({ projectId, onVersionChange }: ProjectVersioningProps) {
  const { language } = useLanguage()
  const { getVersions } = useProjectStore()
  const projectService = new ProjectService()
  const [versions, setVersions] = useState<ProjectVersion[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadVersions()
  }, [projectId])

  const loadVersions = async () => {
    try {
      setLoading(true)
      const vers = await projectService.getVersions(projectId)
      setVersions(vers)
    } catch (error) {
      console.error("Error loading versions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateVersion = async (name: string, description?: string, changeLog?: string) => {
    try {
      setLoading(true)
      // Get current design state from store
      const currentState = {} // In production, get from design store
      
      await projectService.createVersion(projectId, {
        name,
        description,
        snapshot: currentState,
        changeLog,
        tags: [],
      })
      await loadVersions()
      onVersionChange?.()
    } catch (error) {
      console.error("Error creating version:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreVersion = async (versionId: string) => {
    try {
      setLoading(true)
      await projectService.restoreVersion(projectId, versionId)
      await loadVersions()
      onVersionChange?.()
    } catch (error) {
      console.error("Error restoring version:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {language === "ar" ? "إصدارات المشروع" : "Project Versions"}
          </CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {language === "ar" ? "إصدار جديد" : "New Version"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {language === "ar" ? "إنشاء إصدار جديد" : "Create New Version"}
                </DialogTitle>
              </DialogHeader>
              <CreateVersionForm onSubmit={handleCreateVersion} loading={loading} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && versions.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            {language === "ar" ? "جارٍ التحميل..." : "Loading..."}
          </p>
        ) : versions.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            {language === "ar" ? "لا توجد إصدارات" : "No versions"}
          </p>
        ) : (
          <div className="space-y-2">
            {versions
              .sort((a, b) => b.version - a.version)
              .map((version) => (
                <div
                  key={version.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    version.isCurrent ? "bg-emerald-50 border-emerald-200" : "bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">v{version.version}</span>
                        {version.name && (
                          <span className="text-sm text-slate-600">- {version.name}</span>
                        )}
                        {version.isCurrent && (
                          <Badge variant="secondary" className="text-xs">
                            {language === "ar" ? "الحالي" : "Current"}
                          </Badge>
                        )}
                      </div>
                      {version.description && (
                        <p className="text-xs text-slate-500 mt-1">{version.description}</p>
                      )}
                      {version.changeLog && (
                        <p className="text-xs text-slate-600 mt-1">{version.changeLog}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(version.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!version.isCurrent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreVersion(version.id)}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        {language === "ar" ? "استعادة" : "Restore"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CreateVersionForm({
  onSubmit,
  loading,
}: {
  onSubmit: (name: string, description?: string, changeLog?: string) => void
  loading: boolean
}) {
  const { language } = useLanguage()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [changeLog, setChangeLog] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(name.trim() || undefined, description.trim() || undefined, changeLog.trim() || undefined)
    setName("")
    setDescription("")
    setChangeLog("")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>
          {language === "ar" ? "الاسم" : "Name"} (اختياري)
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={language === "ar" ? "إصدار جديد" : "New version"}
        />
      </div>
      <div>
        <Label>
          {language === "ar" ? "الوصف" : "Description"} (اختياري)
        </Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={language === "ar" ? "وصف الإصدار" : "Version description"}
        />
      </div>
      <div>
        <Label>
          {language === "ar" ? "سجل التغييرات" : "Change Log"} (اختياري)
        </Label>
        <Input
          value={changeLog}
          onChange={(e) => setChangeLog(e.target.value)}
          placeholder={language === "ar" ? "ما الذي تغير؟" : "What changed?"}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? language === "ar"
            ? "جارٍ الإنشاء..."
            : "Creating..."
          : language === "ar"
            ? "إنشاء"
            : "Create"}
      </Button>
    </form>
  )
}

