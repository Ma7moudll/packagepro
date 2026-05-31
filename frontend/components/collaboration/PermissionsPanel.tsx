"use client"

import { useState } from "react"
import { useCollaborationStore } from "@/lib/collaboration/collaboration-store"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Shield, Edit, Eye } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { Permission } from "@/lib/collaboration/types"

export function PermissionsPanel() {
  const { language } = useLanguage()
  const [open, setOpen] = useState(false)
  const users = useCollaborationStore((s) => Array.from(s.users.values()))
  const currentUser = useCollaborationStore((s) => s.currentUser)
  const permission = useCollaborationStore((s) => s.permission)

  const handlePermissionChange = (userId: string, newPermission: Permission) => {
    // TODO: Implement permission change
    console.log("Change permission for", userId, "to", newPermission)
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="fixed top-20 right-4 rounded-full shadow-lg"
        onClick={() => setOpen(true)}
      >
        <Users className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <Card className="fixed top-20 right-4 w-80 bg-white shadow-xl z-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            {language === "ar" ? "المستخدمون والصلاحيات" : "Users & Permissions"}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
            <span className="text-lg">×</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
                style={{ backgroundColor: user.color }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium">{user.name}</p>
                {user.id === currentUser?.id && (
                  <p className="text-xs text-slate-500">
                    {language === "ar" ? "(أنت)" : "(You)"}
                  </p>
                )}
              </div>
            </div>
            {user.id === currentUser?.id ? (
              <div className="flex items-center gap-1 text-xs text-slate-600">
                {permission === "owner" && <Shield className="h-4 w-4" />}
                {permission === "edit" && <Edit className="h-4 w-4" />}
                {permission === "view" && <Eye className="h-4 w-4" />}
                <span className="capitalize">{permission}</span>
              </div>
            ) : (
              <Select
                defaultValue={permission}
                onValueChange={(value) => handlePermissionChange(user.id, value as Permission)}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="flex items-center gap-2">
                      <Eye className="h-3 w-3" />
                      {language === "ar" ? "عرض فقط" : "View"}
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="flex items-center gap-2">
                      <Edit className="h-3 w-3" />
                      {language === "ar" ? "تعديل" : "Edit"}
                    </div>
                  </SelectItem>
                  {permission === "owner" && (
                    <SelectItem value="owner">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3 w-3" />
                        {language === "ar" ? "مالك" : "Owner"}
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

