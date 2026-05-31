"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2, User, Mail, Phone, Building, MapPin, Save, AlertCircle, CheckCircle2 } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"

export default function ProfilePage() {
  const { language } = useLanguage()
  const { data: session, update } = useSession()
  const router = useRouter()

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    preferences: {
      language: "ar" as "ar" | "en",
      theme: "light" as "light" | "dark",
      notifications: true,
    },
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (!session) {
      router.push("/auth/signin")
      return
    }

    loadProfile()
  }, [session, router])

  const loadProfile = async () => {
    try {
      const response = await fetch("/api/user/profile")
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
      }
    } catch (error) {
      console.error("Error loading profile:", error)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSaving(true)

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || (language === "ar" ? "حدث خطأ" : "An error occurred"))
        return
      }

      setSuccess(
        language === "ar" ? "تم تحديث الملف الشخصي بنجاح" : "Profile updated successfully"
      )

      // Update session
      await update()

      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      setError(
        language === "ar" ? "حدث خطأ أثناء التحديث" : "An error occurred while updating"
      )
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError(
        language === "ar" ? "كلمات المرور غير متطابقة" : "Passwords do not match"
      )
      return
    }

    if (passwordData.newPassword.length < 8) {
      setError(
        language === "ar"
          ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
          : "Password must be at least 8 characters"
      )
      return
    }

    setSaving(true)

    try {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || (language === "ar" ? "حدث خطأ" : "An error occurred"))
        return
      }

      setSuccess(
        language === "ar" ? "تم تغيير كلمة المرور بنجاح" : "Password changed successfully"
      )

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })

      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      setError(
        language === "ar"
          ? "حدث خطأ أثناء تغيير كلمة المرور"
          : "An error occurred while changing password"
      )
    } finally {
      setSaving(false)
    }
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">
          {language === "ar" ? "الملف الشخصي" : "Profile"}
        </h1>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">
              {language === "ar" ? "الملف الشخصي" : "Profile"}
            </TabsTrigger>
            <TabsTrigger value="password">
              {language === "ar" ? "كلمة المرور" : "Password"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "معلومات الحساب" : "Account Information"}</CardTitle>
                <CardDescription>
                  {language === "ar"
                    ? "قم بتحديث معلوماتك الشخصية"
                    : "Update your personal information"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="mb-4 border-emerald-500 bg-emerald-50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <AlertDescription className="text-emerald-700">{success}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">
                        {language === "ar" ? "الاسم" : "Name"}
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="name"
                          value={profile.name}
                          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">
                        {language === "ar" ? "البريد الإلكتروني" : "Email"}
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          value={profile.email}
                          disabled
                          className="pl-10 bg-slate-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        {language === "ar" ? "الهاتف" : "Phone"} (اختياري)
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="phone"
                          type="tel"
                          value={profile.phone}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company">
                        {language === "ar" ? "الشركة" : "Company"} (اختياري)
                      </Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="company"
                          value={profile.company}
                          onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">
                      {language === "ar" ? "العنوان" : "Address"} (اختياري)
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="address"
                        value={profile.address}
                        onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold">
                      {language === "ar" ? "التفضيلات" : "Preferences"}
                    </h3>

                    <div className="space-y-2">
                      <Label htmlFor="language">
                        {language === "ar" ? "اللغة" : "Language"}
                      </Label>
                      <Select
                        value={profile.preferences.language}
                        onValueChange={(value) =>
                          setProfile({
                            ...profile,
                            preferences: { ...profile.preferences, language: value as "ar" | "en" },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ar">العربية</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="theme">
                        {language === "ar" ? "المظهر" : "Theme"}
                      </Label>
                      <Select
                        value={profile.preferences.theme}
                        onValueChange={(value) =>
                          setProfile({
                            ...profile,
                            preferences: { ...profile.preferences, theme: value as "light" | "dark" },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">
                            {language === "ar" ? "فاتح" : "Light"}
                          </SelectItem>
                          <SelectItem value="dark">
                            {language === "ar" ? "داكن" : "Dark"}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="notifications">
                        {language === "ar" ? "الإشعارات" : "Notifications"}
                      </Label>
                      <Switch
                        id="notifications"
                        checked={profile.preferences.notifications}
                        onCheckedChange={(checked) =>
                          setProfile({
                            ...profile,
                            preferences: { ...profile.preferences, notifications: checked },
                          })
                        }
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {language === "ar" ? "جارٍ الحفظ..." : "Saving..."}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {language === "ar" ? "حفظ التغييرات" : "Save Changes"}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "تغيير كلمة المرور" : "Change Password"}</CardTitle>
                <CardDescription>
                  {language === "ar"
                    ? "قم بتغيير كلمة المرور الخاصة بك"
                    : "Update your password"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="mb-4 border-emerald-500 bg-emerald-50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <AlertDescription className="text-emerald-700">{success}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">
                      {language === "ar" ? "كلمة المرور الحالية" : "Current Password"}
                    </Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">
                      {language === "ar" ? "كلمة المرور الجديدة" : "New Password"}
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      required
                      minLength={8}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      {language === "ar" ? "تأكيد كلمة المرور" : "Confirm Password"}
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {language === "ar" ? "جارٍ التغيير..." : "Changing..."}
                      </>
                    ) : (
                      language === "ar" ? "تغيير كلمة المرور" : "Change Password"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
