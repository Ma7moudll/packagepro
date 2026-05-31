"use client"

import { useState, useEffect } from "react"
import { useProjectStore } from "@/lib/projects/project-store"
import { ProjectService } from "@/lib/projects/project-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Plus, Folder, Grid, List } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { ProjectFolders } from "@/components/projects/ProjectFolders"
import { ProjectList } from "@/components/projects/ProjectList"
import { ProjectTemplates } from "@/components/projects/ProjectTemplates"

export default function ProjectsPage() {
  const { language } = useLanguage()
  const { setProjects, setFolders, filter, setFilter } = useProjectStore()
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const projectService = new ProjectService()

  useEffect(() => {
    loadProjects()
    loadFolders()
  }, [])

  useEffect(() => {
    setFilter({ search: searchQuery || undefined })
  }, [searchQuery, setFilter])

  const loadProjects = async () => {
    try {
      const projects = await projectService.listProjects()
      setProjects(projects)
    } catch (error) {
      console.error("Error loading projects:", error)
    }
  }

  const loadFolders = async () => {
    try {
      const folders = await projectService.getFolders()
      setFolders(folders)
    } catch (error) {
      console.error("Error loading folders:", error)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">
            {language === "ar" ? "المشاريع" : "Projects"}
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
              {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {language === "ar" ? "مشروع جديد" : "New Project"}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={language === "ar" ? "ابحث في المشاريع..." : "Search projects..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              {language === "ar" ? "الكل" : "All"}
            </TabsTrigger>
            <TabsTrigger value="folders">
              <Folder className="h-4 w-4 mr-2" />
              {language === "ar" ? "المجلدات" : "Folders"}
            </TabsTrigger>
            <TabsTrigger value="templates">
              {language === "ar" ? "القوالب" : "Templates"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <ProjectList viewMode={viewMode} />
          </TabsContent>

          <TabsContent value="folders">
            <ProjectFolders />
          </TabsContent>

          <TabsContent value="templates">
            <ProjectTemplates />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

