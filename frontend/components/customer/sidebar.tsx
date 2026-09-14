"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLanguage } from "@/providers/language-provider"
import { useAuth } from "@/providers/auth-provider"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Package,
  Palette,
  User,
  Star,
  LogOut,
  ChevronRight,
  Receipt,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/notifications/notification-bell"

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, labelEn: "Dashboard", labelAr: "لوحة التحكم" },
  { href: "/orders", icon: Package, labelEn: "Orders", labelAr: "الطلبات" },
  { href: "/designs", icon: Palette, labelEn: "Designs", labelAr: "التصاميم" },
  { href: "/billing", icon: Receipt, labelEn: "Billing", labelAr: "الفواتير" },
  { href: "/profile", icon: User, labelEn: "Profile", labelAr: "الملف الشخصي" },
  { href: "/reviews", icon: Star, labelEn: "Reviews", labelAr: "التقييمات" },
]

export function CustomerSidebar() {
  const pathname = usePathname()
  const { language, isRTL } = useLanguage()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <aside className={cn(
      "w-64 bg-white border-l border-gray-200 flex flex-col h-screen sticky top-0",
      isRTL ? "border-l" : "border-r"
    )}>
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between gap-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Package className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">PackagePro</span>
          </Link>
          <NotificationBell />
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive ? "text-emerald-600" : "text-gray-400")} />
              <span className="flex-1">{language === "ar" ? item.labelAr : item.labelEn}</span>
              {isActive && <ChevronRight className={cn("h-4 w-4", isRTL && "rotate-180")} />}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 ml-2" />
          {language === "ar" ? "تسجيل الخروج" : "Log out"}
        </Button>
      </div>
    </aside>
  )
}
