"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Lock, Eye, EyeOff, Smartphone, Key, AlertTriangle, CheckCircle } from "lucide-react"
import { useAuth } from "@/providers/auth-provider"
import { useSecurity } from "@/providers/security-provider"
import { useLanguage } from "@/providers/language-provider"
import { useToast } from "@/hooks/use-toast"

export default function SecurityPage() {
  const { user } = useAuth()
  const { enable2FA, disable2FA, is2FAEnabled, checkSecurity, lastActivity } = useSecurity()
  const { isRTL } = useLanguage()
  const { toast } = useToast()
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  })

  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "كلمات المرور غير متطابقة" : "Passwords do not match",
        variant: "destructive",
      })
      return
    }

    if (passwords.new.length < 8) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل" : "Password must be at least 8 characters",
        variant: "destructive",
      })
      return
    }

    // محاكاة تغيير كلمة المرور
    await new Promise((resolve) => setTimeout(resolve, 1000))

    toast({
      title: isRTL ? "تم التحديث" : "Updated",
      description: isRTL ? "تم تغيير كلمة المرور بنجاح" : "Password changed successfully",
    })

    setPasswords({ current: "", new: "", confirm: "" })
  }

  const handle2FAToggle = async () => {
    if (is2FAEnabled) {
      await disable2FA()
    } else {
      await enable2FA()
    }
  }

  if (!user) {
    return null
  }

  const securityScore = checkSecurity() ? 85 : 45
  const isSecure = securityScore > 70

  return (
    <div className={`container mx-auto px-4 py-8 ${isRTL ? "text-right" : ""}`}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{isRTL ? "إعدادات الأمان" : "Security Settings"}</h1>
        <p className="text-slate-600">
          {isRTL ? "إدارة أمان حسابك وحماية بياناتك" : "Manage your account security and protect your data"}
        </p>
      </div>

      {/* Security Overview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className={`flex items-center ${isRTL ? "flex-row-reverse" : ""}`}>
            <Shield className={`h-5 w-5 ${isRTL ? "ml-2" : "mr-2"} ${isSecure ? "text-green-600" : "text-red-600"}`} />
            {isRTL ? "نظرة عامة على الأمان" : "Security Overview"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-medium">{isRTL ? "نقاط الأمان" : "Security Score"}</span>
            <div className="flex items-center space-x-2">
              <div className={`w-32 h-2 bg-gray-200 rounded-full ${isRTL ? "ml-2" : "mr-2"}`}>
                <div
                  className={`h-2 rounded-full ${isSecure ? "bg-green-500" : "bg-red-500"}`}
                  style={{ width: `${securityScore}%` }}
                />
              </div>
              <span className="font-bold">{securityScore}/100</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`flex items-center space-x-2 ${isRTL ? "space-x-reverse" : ""}`}>
              {is2FAEnabled ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <span className="text-sm">{isRTL ? "المصادقة الثنائية" : "Two-Factor Authentication"}</span>
            </div>

            <div className={`flex items-center space-x-2 ${isRTL ? "space-x-reverse" : ""}`}>
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm">{isRTL ? "كلمة مرور قوية" : "Strong Password"}</span>
            </div>

            <div className={`flex items-center space-x-2 ${isRTL ? "space-x-reverse" : ""}`}>
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm">{isRTL ? "جلسة آمنة" : "Secure Session"}</span>
            </div>
          </div>

          <div className="mt-4 text-sm text-slate-600">
            {isRTL ? "آخر نشاط:" : "Last activity:"} {lastActivity.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="password" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="password">{isRTL ? "كلمة المرور" : "Password"}</TabsTrigger>
          <TabsTrigger value="2fa">{isRTL ? "المصادقة الثنائية" : "2FA"}</TabsTrigger>
          <TabsTrigger value="sessions">{isRTL ? "الجلسات" : "Sessions"}</TabsTrigger>
          <TabsTrigger value="privacy">{isRTL ? "الخصوصية" : "Privacy"}</TabsTrigger>
        </TabsList>

        {/* Password Tab */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center ${isRTL ? "flex-row-reverse" : ""}`}>
                <Lock className={`h-5 w-5 ${isRTL ? "ml-2" : "mr-2"}`} />
                {isRTL ? "تغيير كلمة المرور" : "Change Password"}
              </CardTitle>
              <CardDescription>
                {isRTL ? "قم بتحديث كلمة المرور لحماية حسابك" : "Update your password to keep your account secure"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{isRTL ? "كلمة المرور الحالية" : "Current Password"}</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">{isRTL ? "كلمة المرور الجديدة" : "New Password"}</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={passwords.new}
                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`absolute top-0 h-full px-3 py-2 hover:bg-transparent ${isRTL ? "left-0" : "right-0"}`}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{isRTL ? "تأكيد كلمة المرور" : "Confirm Password"}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                />
              </div>

              <Button onClick={handlePasswordChange} className="w-full">
                {isRTL ? "تحديث كلمة المرور" : "Update Password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2FA Tab */}
        <TabsContent value="2fa">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center ${isRTL ? "flex-row-reverse" : ""}`}>
                <Smartphone className={`h-5 w-5 ${isRTL ? "ml-2" : "mr-2"}`} />
                {isRTL ? "المصادقة الثنائية" : "Two-Factor Authentication"}
              </CardTitle>
              <CardDescription>
                {isRTL ? "أضف طبقة حماية إضافية لحسابك" : "Add an extra layer of security to your account"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                className={`flex items-center justify-between p-4 border rounded-lg ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <div className={`flex items-center space-x-3 ${isRTL ? "space-x-reverse" : ""}`}>
                  <Smartphone className="h-8 w-8 text-blue-600" />
                  <div>
                    <h4 className="font-medium">{isRTL ? "تطبيق المصادقة" : "Authenticator App"}</h4>
                    <p className="text-sm text-slate-600">
                      {isRTL ? "استخدم تطبيق Google Authenticator أو مشابه" : "Use Google Authenticator or similar app"}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center space-x-2 ${isRTL ? "space-x-reverse" : ""}`}>
                  <Badge variant={is2FAEnabled ? "default" : "secondary"}>
                    {is2FAEnabled ? (isRTL ? "مفعل" : "Enabled") : isRTL ? "معطل" : "Disabled"}
                  </Badge>
                  <Button onClick={handle2FAToggle} variant={is2FAEnabled ? "destructive" : "default"}>
                    {is2FAEnabled ? (isRTL ? "إلغاء التفعيل" : "Disable") : isRTL ? "تفعيل" : "Enable"}
                  </Button>
                </div>
              </div>

              {!is2FAEnabled && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className={`flex items-center space-x-2 mb-2 ${isRTL ? "space-x-reverse" : ""}`}>
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <h4 className="font-medium text-yellow-800">{isRTL ? "تحذير أمني" : "Security Warning"}</h4>
                  </div>
                  <p className="text-sm text-yellow-700">
                    {isRTL
                      ? "حسابك غير محمي بالمصادقة الثنائية. ننصح بشدة بتفعيلها لحماية أفضل."
                      : "Your account is not protected with two-factor authentication. We strongly recommend enabling it for better security."}
                  </p>
                </div>
              )}

              {is2FAEnabled && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className={`flex items-center space-x-2 mb-2 ${isRTL ? "space-x-reverse" : ""}`}>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h4 className="font-medium text-green-800">{isRTL ? "محمي" : "Protected"}</h4>
                  </div>
                  <p className="text-sm text-green-700">
                    {isRTL
                      ? "حسابك محمي بالمصادقة الثنائية. ممتاز!"
                      : "Your account is protected with two-factor authentication. Great!"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center ${isRTL ? "flex-row-reverse" : ""}`}>
                <Key className={`h-5 w-5 ${isRTL ? "ml-2" : "mr-2"}`} />
                {isRTL ? "الجلسات النشطة" : "Active Sessions"}
              </CardTitle>
              <CardDescription>
                {isRTL ? "إدارة الأجهزة المتصلة بحسابك" : "Manage devices connected to your account"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                  <div>
                    <h4 className="font-medium">{isRTL ? "الجلسة الحالية" : "Current Session"}</h4>
                    <p className="text-sm text-slate-600">Chrome on Windows • {isRTL ? "الآن" : "Now"}</p>
                    <p className="text-xs text-slate-500">IP: 192.168.1.1</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">{isRTL ? "نشط" : "Active"}</Badge>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                  <div>
                    <h4 className="font-medium">{isRTL ? "جهاز محمول" : "Mobile Device"}</h4>
                    <p className="text-sm text-slate-600">Safari on iPhone • {isRTL ? "منذ ساعتين" : "2 hours ago"}</p>
                    <p className="text-xs text-slate-500">IP: 192.168.1.2</p>
                  </div>
                  <Button variant="outline" size="sm">
                    {isRTL ? "إنهاء الجلسة" : "End Session"}
                  </Button>
                </div>
              </div>

              <Button variant="destructive" className="w-full">
                {isRTL ? "إنهاء جميع الجلسات الأخرى" : "End All Other Sessions"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center ${isRTL ? "flex-row-reverse" : ""}`}>
                <Eye className={`h-5 w-5 ${isRTL ? "ml-2" : "mr-2"}`} />
                {isRTL ? "إعدادات الخصوصية" : "Privacy Settings"}
              </CardTitle>
              <CardDescription>
                {isRTL ? "تحكم في كيفية استخدام بياناتك" : "Control how your data is used"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                <div>
                  <h4 className="font-medium">{isRTL ? "ملف تعريف عام" : "Public Profile"}</h4>
                  <p className="text-sm text-slate-600">
                    {isRTL ? "اجعل ملفك الشخصي مرئياً للآخرين" : "Make your profile visible to others"}
                  </p>
                </div>
                <input type="checkbox" className="rounded" />
              </div>

              <Separator />

              <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                <div>
                  <h4 className="font-medium">{isRTL ? "إشعارات التسويق" : "Marketing Notifications"}</h4>
                  <p className="text-sm text-slate-600">
                    {isRTL ? "تلقي عروض وأخبار المنتجات" : "Receive product offers and news"}
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="rounded" />
              </div>

              <Separator />

              <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                <div>
                  <h4 className="font-medium">{isRTL ? "تحليلات الاستخدام" : "Usage Analytics"}</h4>
                  <p className="text-sm text-slate-600">
                    {isRTL ? "مساعدتنا في تحسين الخدمة" : "Help us improve our service"}
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="rounded" />
              </div>

              <Separator />

              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">{isRTL ? "منطقة الخطر" : "Danger Zone"}</h4>
                <p className="text-sm text-red-700 mb-4">
                  {isRTL
                    ? "حذف حسابك نهائياً. هذا الإجراء لا يمكن التراجع عنه."
                    : "Permanently delete your account. This action cannot be undone."}
                </p>
                <Button variant="destructive">{isRTL ? "حذف الحساب" : "Delete Account"}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
