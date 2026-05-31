"use client"

import { useProjectStore } from "@/lib/projects/project-store"
import { Project } from "@/lib/projects/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Folder, Share2, History, MessageSquare, CheckCircle2, XCircle } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import Link from "next/link"

interface ProjectListProps {
  viewMode: "grid" | "list"
}

export function ProjectList({ viewMode }: ProjectListProps) {
  const { language } = useLanguage()
  const {
    getFilteredProjects,
    selectedProjects,
    toggleSelection,
    selectAll,
    deselectAll,
    filter,
    setFilter,
    sort,
    setSort,
  } = useProjectStore()

  const projects = getFilteredProjects()

  if (viewMode === "grid") {
    return (
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Select
              value={filter.status?.[0] || "all"}
              onValueChange={(value) =>
                setFilter({ status: value === "all" ? undefined : [value] })
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder={language === "ar" ? "الحالة" : "Status"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {language === "ar" ? "الكل" : "All Status"}
                </SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in-progress">
                  {language === "ar" ? "قيد التنفيذ" : "In Progress"}
                </SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sort.field}
              onValueChange={(value) => setSort({ ...sort, field: value as any })}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updatedAt">
                  {language === "ar" ? "آخر تحديث" : "Last Updated"}
                </SelectItem>
                <SelectItem value="name">
                  {language === "ar" ? "الاسم" : "Name"}
                </SelectItem>
                <SelectItem value="createdAt">
                  {language === "ar" ? "تاريخ الإنشاء" : "Created Date"}
                </SelectItem>
                <SelectItem value="status">
                  {language === "ar" ? "الحالة" : "Status"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              {language === "ar" ? "تحديد الكل" : "Select All"}
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll}>
              {language === "ar" ? "إلغاء التحديد" : "Deselect All"}
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isSelected={selectedProjects.has(project.id)}
              onSelect={() => toggleSelection(project.id)}
            />
          ))}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">
              {language === "ar" ? "لا توجد مشاريع" : "No projects found"}
            </p>
          </div>
        )}
      </div>
    )
  }

  // List view
  return (
    <div className="space-y-2">
      {projects.map((project) => (
        <Card key={project.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <Checkbox
                  checked={selectedProjects.has(project.id)}
                  onCheckedChange={() => toggleSelection(project.id)}
                />
                {project.thumbnailUrl ? (
                  <img
                    src={project.thumbnailUrl}
                    alt={project.name}
                    className="w-16 h-16 rounded object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-slate-200 rounded flex items-center justify-center">
                    <Folder className="h-8 w-8 text-slate-400" />
                  </div>
                )}
                <div className="flex-1">
                  <Link href={`/projects/${project.id}`}>
                    <h3 className="font-semibold hover:text-emerald-600">{project.name}</h3>
                  </Link>
                  {project.description && (
                    <p className="text-sm text-slate-600 mt-1 line-clamp-1">{project.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {project.status}
                    </Badge>
                    {project.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  {new Date(project.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {project.sharedWith.length > 0 && (
                  <Button variant="ghost" size="icon" title={`Shared with ${project.sharedWith.length} users`}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" title="Versions">
                  <History className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Comments">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ProjectCard({
  project,
  isSelected,
  onSelect,
}: {
  project: Project
  isSelected: boolean
  onSelect: () => void
}) {
  const { language } = useLanguage()

  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-emerald-500" : ""
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-0">
        <div className="relative">
          {project.thumbnailUrl ? (
            <img
              src={project.thumbnailUrl}
              alt={project.name}
              className="w-full h-32 object-cover rounded-t-lg"
            />
          ) : (
            <div className="w-full h-32 bg-slate-200 rounded-t-lg flex items-center justify-center">
              <Folder className="h-8 w-8 text-slate-400" />
            </div>
          )}
          {isSelected && (
            <div className="absolute top-2 right-2">
              <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            </div>
          )}
          <div className="absolute top-2 left-2">
            <Badge
              variant="secondary"
              className={`text-xs ${
                project.status === "approved"
                  ? "bg-emerald-100 text-emerald-700"
                  : project.status === "review"
                    ? "bg-yellow-100 text-yellow-700"
                    : project.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : ""
              }`}
            >
              {project.status}
            </Badge>
          </div>
        </div>
        <div className="p-3">
          <Link href={`/projects/${project.id}`}>
            <h3 className="font-semibold text-sm hover:text-emerald-600">{project.name}</h3>
          </Link>
          {project.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{project.description}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              {project.sharedWith.length > 0 && (
                <>
                  <Share2 className="h-3 w-3" />
                  <span>{project.sharedWith.length}</span>
                </>
              )}
            </div>
            <span className="text-xs text-slate-500">
              v{project.version}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

