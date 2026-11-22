"use client"

import { useState } from "react"
import { useLanguage } from "@/providers/language-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Share2 } from "lucide-react"

export function ShareDialog({
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: { open?: boolean; onOpenChange?: (open: boolean) => void; hideTrigger?: boolean } = {}) {
  const { language } = useLanguage()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = (value: boolean) => {
    setInternalOpen(value)
    onOpenChange?.(value)
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Share2 className="h-4 w-4 mr-2" />
            {language === "ar" ? "مشاركة" : "Share"}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-4 sm:p-6 [&>button[data-slot=dialog-close]]:left-3 [&>button[data-slot=dialog-close]]:right-auto [&>button[data-slot=dialog-close]]:top-3 [&>button[data-slot=dialog-close]]:h-8 [&>button[data-slot=dialog-close]]:w-8 [&>button[data-slot=dialog-close]]:flex [&>button[data-slot=dialog-close]]:items-center [&>button[data-slot=dialog-close]]:justify-center">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 ps-10">
            <Share2 className="h-5 w-5" />
            {language === "ar" ? "مشاركة التصميم" : "Share Design"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4 min-h-0 overflow-y-auto text-sm text-slate-600">
          <p role="status" className="font-medium text-slate-900">
            {language === "ar" ? "مشاركة التصميم غير متاحة حاليًا." : "Design sharing is not available yet."}
          </p>
          <p>
            {language === "ar"
              ? "لا يتم إنشاء رابط مشاركة أو إرسال دعوات أو منح صلاحية وصول من هنا."
              : "No sharing link is created, no invitations are sent, and no access is granted here."}
          </p>
          <p>
            {language === "ar"
              ? "لمشاركة ملف بنفسك، استخدم تبويب التصدير لحفظ مرجع RGB محلي. هذا الملف ليس جاهزًا للإنتاج."
              : "To share a file yourself, use the Export tab to save a local RGB reference. That file is not production-ready."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
