"use client"

import { useState } from "react"
import { useProjectStore } from "@/lib/projects/project-store"
import { ProjectService } from "@/lib/projects/project-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Folder, Plus, FolderPlus, Trash2, Edit } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { ProjectFolder } from "@/lib/projects/types"

export function ProjectFolders() {
  const { language } = useLanguage()
  const { folders, filter, setFilter, getFilteredProjects } = useProjectStore()
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const projectService = new ProjectService()

  const handleCreateFolder = async (name: string, parentId?: string) => {
    try {
      await projectService.createFolder({
        name,
        parentId,
      })
      // Reload folders
      const updatedFolders = await projectService.getFolders()
      useProjectStore.getState().setFolders(updatedFolders)
    } catch (error) {
      console.error("Error creating folder:", error)
    }
  }

  const projects = getFilteredProjects()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Folders Sidebar */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                {language === "ar" ? "المجلدات" : "Folders"}
              </CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {language === "ar" ? "مجلد جديد" : "New Folder"}
                    </DialogTitle>
                  </DialogHeader>
                  <CreateFolderForm onSubmit={handleCreateFolder} />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => {
                setSelectedFolder(null)
                setFilter({ folderId: undefined })
              }}
              className={`w-full text-left p-2 rounded ${
                selectedFolder === null ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-50"
              }`}
            >
              {language === "ar" ? "الكل" : "All Projects"}
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => {
                  setSelectedFolder(folder.id)
                  setFilter({ folderId: folder.id })
                }}
                className={`w-full text-left p-2 rounded flex items-center gap-2 ${
                  selectedFolder === folder.id ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-50"
                }`}
              >
                <Folder className="h-4 w-4" />
                <span className="flex-1">{folder.name}</span>
                <span className="text-xs text-slate-500">{folder.projectCount}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Projects in Folder */}
      <div className="lg:col-span-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {project.thumbnailUrl ? (
                  <img
                    src={project.thumbnailUrl}
                    alt={project.name}
                    className="w-full h-32 object-cover rounded mb-3"
                  />
                ) : (
                  <div className="w-full h-32 bg-slate-200 rounded mb-3 flex items-center justify-center">
                    <Folder className="h-8 w-8 text-slate-400" />
                  </div>
                )}
                <h3 className="font-semibold mb-1">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-slate-600 mb-2 line-clamp-2">{project.description}</p>
                )}
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    project.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                    project.status === "review" ? "bg-yellow-100 text-yellow-700" :
                    project.status === "rejected" ? "bg-red-100 text-red-700" :
                    "bg-slate-100 text-slate-700"
                  }`}>
                    {project.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function CreateFolderForm({ onSubmit }: { onSubmit: (name: string, parentId?: string) => void }) {
  const { language } = useLanguage()
  const [name, setName] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onSubmit(name.trim())
      setName("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>
          {language === "ar" ? "اسم المجلد" : "Folder Name"}
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={language === "ar" ? "مجلد جديد" : "New folder"}
          required
        />
      </div>
      <Button type="submit" className="w-full">
        {language === "ar" ? "إنشاء" : "Create"}
      </Button>
    </form>
  )
}

