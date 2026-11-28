"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLanguage } from "@/providers/language-provider"
import { useAuth } from "@/providers/auth-provider"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Package,
  FileText,
  ShoppingCart,
  LogOut,
  ChevronRight,
  Factory,
  Camera,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const NAV_ITEMS = [
  { href: "/manufacturer", icon: LayoutDashboard, labelEn: "Dashboard", labelAr: "لوحة التحكم" },
  { href: "/manufacturer/orders", icon: ShoppingCart, labelEn: "Orders", labelAr: "الطلبات" },
  { href: "/manufacturer/samples", icon: Camera, labelEn: "Samples", labelAr: "العينات" },
  { href: "/manufacturer/quotes", icon: FileText, labelEn: "Quotes", labelAr: "عروض الأسعار" },
  { href: "/manufacturer/products", icon: Package, labelEn: "Products", labelAr: "المنتجات" },
  { href: "/manufacturer/settings", icon: Settings, labelEn: "Settings", labelAr: "الإعدادات" },
]

export function VendorSidebar() {
  const pathname = usePathname()
  const { language, isRTL } = useLanguage()
  const { user, logout } = useAuth()

  return (
    <aside className={cn(
      "w-full md:w-64 md:shrink-0 bg-white border-b md:border-b-0 border-gray-200 flex flex-col md:h-screen md:sticky md:top-0",
      isRTL ? "border-l" : "border-r"
    )}>
      <div className="p-4 md:p-6 border-b border-gray-200">
        <Link href="/manufacturer" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Factory className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900">
            {language === "ar" ? "بوابة المورد" : "Vendor Portal"}
          </span>
        </Link>
      </div>

      {user && (
        <div className="hidden md:block px-6 py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
        </div>
      )}

      <nav aria-label={language === "ar" ? "تنقل المورد" : "Vendor navigation"} className="grid grid-cols-2 md:flex-1 md:block p-3 md:p-4 gap-1 md:space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/manufacturer" && pathname.startsWith(item.href + "/"))
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-w-0 items-center gap-2 md:gap-3 px-2 md:px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive ? "text-indigo-600" : "text-gray-400")} />
              <span className="flex-1">{language === "ar" ? item.labelAr : item.labelEn}</span>
              {isActive && <ChevronRight className={cn("h-4 w-4", isRTL && "rotate-180")} />}
            </Link>
          )
        })}
      </nav>

      <div className="p-2 md:p-4 border-t border-gray-200">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50"
          onClick={logout}
        >
          <LogOut className="h-4 w-4 ml-2" />
          {language === "ar" ? "تسجيل الخروج" : "Log out"}
        </Button>
      </div>
    </aside>
  )
}
