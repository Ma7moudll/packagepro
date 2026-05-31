"use client"

import { useState, useEffect } from "react"
import { useExportStore } from "@/lib/export/export-store"
import { ExportService } from "@/lib/export/export-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import { Download, RefreshCw, XCircle, CheckCircle2, Clock } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { ExportJob } from "@/lib/export/types"
import { formatFileSize } from "@/lib/utils"

export function ExportJobs() {
  const { language } = useLanguage()
  const { jobs, setJobs, updateJob, activeJobs } = useExportStore()
  const exportService = new ExportService()

  useEffect(() => {
    loadJobs()
    // Poll active jobs
    const interval = setInterval(() => {
      activeJobs.forEach(async (jobId) => {
        try {
          const job = await exportService.getJobStatus(jobId)
          updateJob(jobId, job)
        } catch (error) {
          console.error("Error polling job:", error)
        }
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [activeJobs.size])

  const loadJobs = async () => {
    // In production, fetch from API
    // const jobsData = await exportService.getJobs()
    // setJobs(jobsData)
  }

  const handleDownload = async (job: ExportJob, fileId?: string) => {
    try {
      const blob = await exportService.downloadExport(job.id, fileId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileId
        ? job.files.find((f) => f.id === fileId)?.name || "export"
        : `export-${job.id}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error downloading:", error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "processing":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-slate-400" />
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">
        {language === "ar" ? "مهام التصدير" : "Export Jobs"}
      </h2>

      <div className="space-y-3">
        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">
              {language === "ar" ? "لا توجد مهام تصدير" : "No export jobs"}
            </p>
          </div>
        ) : (
          jobs.map((job) => (
            <Card key={job.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {getStatusIcon(job.status)}
                    {language === "ar" ? "مهمة تصدير" : "Export Job"} - {job.id.slice(0, 8)}
                  </CardTitle>
                  <Badge
                    variant={
                      job.status === "completed"
                        ? "default"
                        : job.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {job.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {job.status === "processing" && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{language === "ar" ? "التقدم" : "Progress"}</span>
                      <span>{job.progress}%</span>
                    </div>
                    <Progress value={job.progress} />
                  </div>
                )}

                {job.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {job.error}
                  </div>
                )}

                {job.files.length > 0 && (
                  <div>
                    <Label className="mb-2 block text-sm">
                      {language === "ar" ? "الملفات" : "Files"} ({job.files.length})
                    </Label>
                    <div className="space-y-2">
                      {job.files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-2 bg-slate-50 rounded"
                        >
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-slate-500">
                              {formatFileSize(file.size)} • {file.format.toUpperCase()}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(job, file.id)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            {language === "ar" ? "تحميل" : "Download"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {job.status === "completed" && job.files.length > 1 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleDownload(job)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {language === "ar" ? "تحميل الكل كـ ZIP" : "Download All as ZIP"}
                  </Button>
                )}

                <div className="text-xs text-slate-500">
                  {language === "ar" ? "تاريخ الإنشاء" : "Created"}:{" "}
                  {new Date(job.createdAt).toLocaleString()}
                  {job.completedAt && (
                    <>
                      <br />
                      {language === "ar" ? "تاريخ الإكمال" : "Completed"}:{" "}
                      {new Date(job.completedAt).toLocaleString()}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

