"use client"

import { useState } from "react"
import { useExportStore } from "@/lib/export/export-store"
import { ExportService } from "@/lib/export/export-service"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "@/providers/language-provider"
import { BatchExport } from "@/components/export/BatchExport"
import { ExportPresets } from "@/components/export/ExportPresets"
import { ExportScheduling } from "@/components/export/ExportScheduling"
import { ExportJobs } from "@/components/export/ExportJobs"

export default function ExportPage() {
  const { language } = useLanguage()
  const exportService = new ExportService()

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <h1 className="text-3xl font-bold mb-8">
          {language === "ar" ? "التصدير" : "Export"}
        </h1>

        <Tabs defaultValue="batch" className="space-y-4">
          <TabsList>
            <TabsTrigger value="batch">
              {language === "ar" ? "تصدير مجمع" : "Batch Export"}
            </TabsTrigger>
            <TabsTrigger value="presets">
              {language === "ar" ? "الإعدادات المسبقة" : "Presets"}
            </TabsTrigger>
            <TabsTrigger value="scheduling">
              {language === "ar" ? "الجدولة" : "Scheduling"}
            </TabsTrigger>
            <TabsTrigger value="jobs">
              {language === "ar" ? "المهام" : "Jobs"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="batch">
            <BatchExport />
          </TabsContent>

          <TabsContent value="presets">
            <ExportPresets />
          </TabsContent>

          <TabsContent value="scheduling">
            <ExportScheduling />
          </TabsContent>

          <TabsContent value="jobs">
            <ExportJobs />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

