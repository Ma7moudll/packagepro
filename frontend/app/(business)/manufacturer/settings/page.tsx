"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/providers/auth-provider"
import { useLanguage } from "@/providers/language-provider"
import { useToast } from "@/hooks/use-toast"
import { vendorsApi, type VendorProfile } from "@/lib/api/vendors"
import { Loader2, Save, Star } from "lucide-react"

/**
 * Vendor company profile (SPEC-029 Week 8): self-service company details,
 * backed by GET/PATCH /vendors/me.
 */
export default function VendorSettingsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { language } = useLanguage()
  const { toast } = useToast()

  const [profile, setProfile] = useState<VendorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN"))) {
      router.push("/login")
      return
    }
    if (!user) return

    vendorsApi
      .getVendorProfile()
      .then((res) => {
        if (res.success && res.data) setProfile(res.data)
      })
      .catch((err) => console.error("Failed to load vendor profile:", err))
      .finally(() => setLoading(false))
  }, [user, authLoading, router])

  if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) return null

  const set = (field: keyof VendorProfile, value: string) =>
    setProfile((prev) => (prev ? { ...prev, [field]: value } : prev))

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    try {
      const res = await vendorsApi.updateVendorProfile({
        companyName: profile.companyName,
        phone: profile.phone || undefined,
        address: profile.address,
        city: profile.city,
        country: profile.country,
        postalCode: profile.postalCode || undefined,
      })
      if (res.success) {
        toast({
          title: language === "ar" ? "تم الحفظ" : "Profile saved",
          description: language === "ar" ? "تم تحديث بيانات الشركة." : "Company details updated.",
        })
      }
    } catch (err) {
      console.error("Failed to save vendor profile:", err)
      toast({
        title: language === "ar" ? "فشل الحفظ" : "Save failed",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const labels = {
    companyName: { ar: "اسم الشركة", en: "Company name" },
    phone: { ar: "الهاتف", en: "Phone" },
    address: { ar: "العنوان", en: "Address" },
    city: { ar: "المدينة", en: "City" },
    country: { ar: "الدولة", en: "Country" },
    postalCode: { ar: "الرمز البريدي", en: "Postal code" },
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {language === "ar" ? "إعدادات المورد" : "Vendor Settings"}
        </h1>
        <p className="text-sm text-slate-500">
          {language === "ar"
            ? "بيانات شركتك كما تظهر للمنصة والعملاء"
            : "Your company details as shown to the platform and customers"}
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !profile ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-500">
            {language === "ar"
              ? "لا يوجد ملف مورد مرتبط بهذا الحساب."
              : "No vendor profile is linked to this account."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {language === "ar" ? "بيانات الشركة" : "Company profile"}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={profile.isActive ? "secondary" : "outline"}>
                  {profile.isActive
                    ? language === "ar"
                      ? "نشط"
                      : "Active"
                    : language === "ar"
                      ? "غير نشط"
                      : "Inactive"}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Star className="h-3 w-3 text-amber-500" />
                  {profile.qualityRating?.toFixed(1) ?? "—"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {(Object.keys(labels) as (keyof typeof labels)[]).map((field) => (
              <div key={field} className="space-y-1.5">
                <Label htmlFor={field}>
                  {language === "ar" ? labels[field].ar : labels[field].en}
                </Label>
                <Input
                  id={field}
                  value={(profile[field] as string | null) ?? ""}
                  onChange={(e) => set(field, e.target.value)}
                  disabled={saving}
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-4 pt-2 text-sm text-slate-500">
              <p>
                {language === "ar" ? "البريد الإلكتروني" : "Email"}: {profile.email ?? user.email}
              </p>
              <p>
                {language === "ar" ? "الحد الأدنى للطلب" : "MOQ"}: {profile.minOrderQuantity ?? "—"}
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {language === "ar" ? "حفظ التغييرات" : "Save changes"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
