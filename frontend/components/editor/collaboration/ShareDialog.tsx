"use client"

import { useState, useCallback } from "react"
import { useLanguage } from "@/providers/language-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Share2,
  Copy,
  Check,
  Mail,
  Link2,
  Users,
  Eye,
  Edit3,
  Lock,
  Globe,
  UserPlus,
  X,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

type Permission = "view" | "comment" | "edit"

interface SharedUser {
  id: string
  email: string
  name: string
  initials: string
  permission: Permission
}

const SAMPLE_SHARED_USERS: SharedUser[] = [
  {
    id: "1",
    email: "ahmed@example.com",
    name: "Ahmed",
    initials: "أ",
    permission: "edit",
  },
  {
    id: "2",
    email: "sara@example.com",
    name: "Sara",
    initials: "س",
    permission: "comment",
  },
]

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
  const [shareLink, setShareLink] = useState("")
  const [linkCopied, setLinkCopied] = useState(false)
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>(SAMPLE_SHARED_USERS)
  const [newEmail, setNewEmail] = useState("")
  const [newPermission, setNewPermission] = useState<Permission>("view")
  const [linkEnabled, setLinkEnabled] = useState(false)
  const [linkPermission, setLinkPermission] = useState<Permission>("view")

  // Generate share link
  const generateShareLink = useCallback(() => {
    const link = `${window.location.origin}/editor/shared/${Date.now().toString(36)}`
    setShareLink(link)
    setLinkEnabled(true)
  }, [])

  // Copy link to clipboard
  const copyLink = useCallback(() => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }, [shareLink])

  // Add user
  const handleAddUser = useCallback(() => {
    if (!newEmail.trim()) return

    const user: SharedUser = {
      id: Date.now().toString(),
      email: newEmail,
      name: newEmail.split("@")[0],
      initials: newEmail[0].toUpperCase(),
      permission: newPermission,
    }

    setSharedUsers([...sharedUsers, user])
    setNewEmail("")
  }, [newEmail, newPermission, sharedUsers])

  // Remove user
  const removeUser = useCallback(
    (userId: string) => {
      setSharedUsers(sharedUsers.filter((u) => u.id !== userId))
    },
    [sharedUsers]
  )

  // Update user permission
  const updateUserPermission = useCallback(
    (userId: string, permission: Permission) => {
      setSharedUsers(
        sharedUsers.map((u) => (u.id === userId ? { ...u, permission } : u))
      )
    },
    [sharedUsers]
  )

  const permissionLabels: Record<Permission, { en: string; ar: string; icon: typeof Eye }> = {
    view: { en: "Can view", ar: "عرض فقط", icon: Eye },
    comment: { en: "Can comment", ar: "تعليق", icon: Users },
    edit: { en: "Can edit", ar: "تعديل", icon: Edit3 },
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

        <div className="space-y-6 py-4 min-h-0 overflow-y-auto">
          {/* Add People */}
          <div className="space-y-3">
            <Label className="text-xs font-bold flex items-center gap-2">
              <UserPlus className="h-3 w-3" />
              {language === "ar" ? "إضافة أشخاص" : "Add People"}
            </Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder={language === "ar" ? "البريد الإلكتروني" : "Email address"}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="text-xs h-9 flex-1"
              />
              <Select
                value={newPermission}
                onValueChange={(v: Permission) => setNewPermission(v)}
              >
                <SelectTrigger className="w-28 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(permissionLabels).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {language === "ar" ? value.ar : value.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-9"
                onClick={handleAddUser}
                disabled={!newEmail.trim()}
              >
                <Mail className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Shared Users List */}
          {sharedUsers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-bold">
                {language === "ar" ? "الأشخاص المضافون" : "People with access"}
              </Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {sharedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs bg-slate-200">
                          {user.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-medium">{user.name}</p>
                        <p className="text-[10px] text-slate-400">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Select
                        value={user.permission}
                        onValueChange={(v: Permission) =>
                          updateUserPermission(user.id, v)
                        }
                      >
                        <SelectTrigger className="w-24 h-7 text-[10px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(permissionLabels).map(([key, value]) => (
                            <SelectItem key={key} value={key} className="text-xs">
                              {language === "ar" ? value.ar : value.en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-red-500"
                        onClick={() => removeUser(user.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Share Link */}
          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold flex items-center gap-2">
                <Link2 className="h-3 w-3" />
                {language === "ar" ? "رابط المشاركة" : "Share Link"}
              </Label>
              <Switch
                checked={linkEnabled}
                onCheckedChange={(checked) => {
                  if (checked && !shareLink) {
                    generateShareLink()
                  } else {
                    setLinkEnabled(checked)
                  }
                }}
              />
            </div>

            {linkEnabled && (
              <>
                <div className="flex gap-2">
                  <Input
                    value={shareLink}
                    readOnly
                    className="text-xs h-9 font-mono bg-slate-50"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={copyLink}
                  >
                    {linkCopied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Globe className="h-3 w-3 text-slate-400" />
                  <span className="text-xs text-slate-500">
                    {language === "ar"
                      ? "أي شخص لديه الرابط يمكنه"
                      : "Anyone with the link can"}
                  </span>
                  <Select
                    value={linkPermission}
                    onValueChange={(v: Permission) => setLinkPermission(v)}
                  >
                    <SelectTrigger className="h-6 w-24 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view" className="text-xs">
                        {language === "ar" ? "عرض" : "View"}
                      </SelectItem>
                      <SelectItem value="comment" className="text-xs">
                        {language === "ar" ? "تعليق" : "Comment"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {/* Info */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-[10px] text-amber-800">
              {language === "ar"
                ? "⚠️ المشاركة متاحة حالياً كعرض توضيحي. سيتم تفعيل المشاركة الفعلية عند ربط النظام بالخادم."
                : "⚠️ Sharing is currently in demo mode. Real sharing will be enabled when connected to the backend."}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
