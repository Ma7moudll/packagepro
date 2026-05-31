"use client"

import { useState, useEffect } from "react"
import { useExportStore } from "@/lib/export/export-store"
import { ExportService } from "@/lib/export/export-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Clock, Play, Pause } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { ExportSchedule, ScheduleConfig } from "@/lib/export/types"

export function ExportScheduling() {
  const { language } = useLanguage()
  const { schedules, setSchedules, updateSchedule, deleteSchedule } = useExportStore()
  const exportService = new ExportService()
  const [editingSchedule, setEditingSchedule] = useState<ExportSchedule | null>(null)

  useEffect(() => {
    loadSchedules()
  }, [])

  const loadSchedules = async () => {
    try {
      const schedulesData = await exportService.getSchedules()
      setSchedules(schedulesData)
    } catch (error) {
      console.error("Error loading schedules:", error)
    }
  }

  const handleToggle = async (schedule: ExportSchedule) => {
    try {
      await exportService.updateSchedule(schedule.id, { enabled: !schedule.enabled })
      updateSchedule(schedule.id, { enabled: !schedule.enabled })
    } catch (error) {
      console.error("Error toggling schedule:", error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await exportService.deleteSchedule(id)
      deleteSchedule(id)
    } catch (error) {
      console.error("Error deleting schedule:", error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {language === "ar" ? "جدولة التصدير التلقائي" : "Automated Export Scheduling"}
        </h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {language === "ar" ? "جدولة جديدة" : "New Schedule"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {language === "ar" ? "جدولة تصدير جديدة" : "New Export Schedule"}
              </DialogTitle>
            </DialogHeader>
            <ScheduleForm
              schedule={editingSchedule}
              onSuccess={() => {
                setEditingSchedule(null)
                loadSchedules()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {schedules.map((schedule) => (
          <Card key={schedule.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{schedule.name}</h3>
                    <Badge variant={schedule.enabled ? "default" : "secondary"}>
                      {schedule.enabled
                        ? language === "ar"
                          ? "مفعّل"
                          : "Enabled"
                        : language === "ar"
                          ? "معطّل"
                          : "Disabled"}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-600 space-y-1">
                    <p>
                      {language === "ar" ? "المشروع" : "Project"}: {schedule.projectId}
                    </p>
                    <p>
                      {language === "ar" ? "النوع" : "Type"}: {schedule.schedule.type}
                    </p>
                    <p>
                      {language === "ar" ? "الوقت" : "Time"}: {schedule.schedule.time}
                    </p>
                    {schedule.nextRun && (
                      <p>
                        {language === "ar" ? "التشغيل القادم" : "Next Run"}:{" "}
                        {new Date(schedule.nextRun).toLocaleString()}
                      </p>
                    )}
                    {schedule.lastRun && (
                      <p>
                        {language === "ar" ? "آخر تشغيل" : "Last Run"}:{" "}
                        {new Date(schedule.lastRun).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={schedule.enabled}
                    onCheckedChange={() => handleToggle(schedule)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingSchedule(schedule)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(schedule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {schedules.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">
            {language === "ar" ? "لا توجد جداول" : "No schedules yet"}
          </p>
        </div>
      )}
    </div>
  )
}

function ScheduleForm({
  schedule,
  onSuccess,
}: {
  schedule: ExportSchedule | null
  onSuccess: () => void
}) {
  const { language } = useLanguage()
  const exportService = new ExportService()
  const [name, setName] = useState(schedule?.name || "")
  const [projectId, setProjectId] = useState(schedule?.projectId || "")
  const [presetId, setPresetId] = useState(schedule?.presetId || "")
  const [scheduleType, setScheduleType] = useState<ScheduleConfig["type"]>(
    schedule?.schedule.type || "daily"
  )
  const [time, setTime] = useState(schedule?.schedule.time || "09:00")
  const [dayOfWeek, setDayOfWeek] = useState(schedule?.schedule.dayOfWeek || 1)
  const [dayOfMonth, setDayOfMonth] = useState(schedule?.schedule.dayOfMonth || 1)
  const [enabled, setEnabled] = useState(schedule?.enabled ?? true)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const scheduleConfig: ScheduleConfig = {
        type: scheduleType,
        time,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(scheduleType === "weekly" && { dayOfWeek }),
        ...(scheduleType === "monthly" && { dayOfMonth }),
      }

      if (schedule) {
        await exportService.updateSchedule(schedule.id, {
          name,
          schedule: scheduleConfig,
          enabled,
        })
      } else {
        await exportService.createSchedule({
          name,
          projectId,
          presetId: presetId || undefined,
          settings: {
            dpi: 300,
            quality: 100,
            colorMode: "cmyk",
            format: "pdf",
            includeBleed: true,
            bleedSize: 3,
            includeCropMarks: true,
            includeColorBars: false,
            includeRegistrationMarks: false,
          },
          schedule: scheduleConfig,
          enabled,
        })
      }
      onSuccess()
    } catch (error) {
      console.error("Error saving schedule:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>
          {language === "ar" ? "الاسم" : "Name"} *
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <Label>
          {language === "ar" ? "معرّف المشروع" : "Project ID"} *
        </Label>
        <Input
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          required
        />
      </div>

      <div>
        <Label>
          {language === "ar" ? "نوع الجدولة" : "Schedule Type"}
        </Label>
        <Select value={scheduleType} onValueChange={(v) => setScheduleType(v as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">
              {language === "ar" ? "يومي" : "Daily"}
            </SelectItem>
            <SelectItem value="weekly">
              {language === "ar" ? "أسبوعي" : "Weekly"}
            </SelectItem>
            <SelectItem value="monthly">
              {language === "ar" ? "شهري" : "Monthly"}
            </SelectItem>
            <SelectItem value="custom">
              {language === "ar" ? "مخصص" : "Custom"}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>
          {language === "ar" ? "الوقت" : "Time"} *
        </Label>
        <Input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
        />
      </div>

      {scheduleType === "weekly" && (
        <div>
          <Label>
            {language === "ar" ? "يوم الأسبوع" : "Day of Week"}
          </Label>
          <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(parseInt(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Sunday</SelectItem>
              <SelectItem value="1">Monday</SelectItem>
              <SelectItem value="2">Tuesday</SelectItem>
              <SelectItem value="3">Wednesday</SelectItem>
              <SelectItem value="4">Thursday</SelectItem>
              <SelectItem value="5">Friday</SelectItem>
              <SelectItem value="6">Saturday</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {scheduleType === "monthly" && (
        <div>
          <Label>
            {language === "ar" ? "يوم الشهر" : "Day of Month"}
          </Label>
          <Input
            type="number"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
            min={1}
            max={31}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Switch checked={enabled} onCheckedChange={setEnabled} />
        <Label>
          {language === "ar" ? "مفعّل" : "Enabled"}
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? language === "ar"
            ? "جارٍ الحفظ..."
            : "Saving..."
          : language === "ar"
            ? "حفظ"
            : "Save"}
      </Button>
    </form>
  )
}

