"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { Menu, Package, ShoppingCart, Phone, User, LogOut, Settings, Shield, Building2, FileText } from "lucide-react"
import { useCart } from "@/providers/cart-provider"
import { useAuth } from "@/providers/auth-provider"
import { useLanguage } from "@/providers/language-provider"
import { LanguageSwitcher } from "@/components/features/language-switcher"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { items } = useCart()
  const { user, logout } = useAuth()
  const { t, isRTL } = useLanguage()
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const pathname = usePathname()

  // The design editor is a full-screen app surface: the marketing nav only
  // crowds it (Packhelp-style editor has no site chrome over the canvas).
  if (pathname?.startsWith("/editor")) return null
  // Bounded receiver workspace uses compact operator chrome at320px.
  if (pathname === "/receiving") return <header className="border-b bg-white"><nav aria-label={isRTL ? "التنقل" : "Navigation"} className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3"><Link href="/" className="font-bold text-slate-900">PackagePro</Link><LanguageSwitcher /></nav></header>

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b bg-white backdrop-blur-sm ${isRTL ? "font-cairo" : ""}`}
    >
      <div className="container mx-auto px-2 min-[360px]:px-3 sm:px-4">
        <div className={`flex min-h-16 flex-wrap gap-y-2 py-2 items-center ${isRTL ? "flex-row-reverse" : "justify-between"}`}>
          {/* Logo */}
          <Link href="/" className={`flex items-center space-x-2 ${isRTL ? "space-x-reverse" : ""}`}>
            <Package className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-600" />
            <span className="text-lg min-[360px]:text-xl sm:text-2xl font-bold text-slate-900">PackagePro</span>
          </Link>

          {/* Desktop Navigation */}
          {/* Full nav needs ~1150px; below xl the hamburger takes over so the
              right-side actions never clip. */}
          <NavigationMenu className="hidden xl:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>{t("nav.products")}</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid w-[400px] gap-3 p-4">
                    <NavigationMenuLink asChild>
                      <Link
                        href="/products"
                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <div className="text-sm font-medium leading-none">{isRTL ? "جميع المنتجات" : "All Products"}</div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          {isRTL
                            ? "تصفح مجموعتنا الكاملة من منتجات التغليف"
                            : "Browse our complete range of packaging products"}
                        </p>
                      </Link>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/industries"
                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <div className="text-sm font-medium leading-none">
                          {isRTL ? "حلول الصناعات" : "Industry Solutions"}
                        </div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          {isRTL
                            ? "حلول مخصصة لمختلف الصناعات"
                            : "Custom solutions for different industries"}
                        </p>
                      </Link>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/wholesale"
                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <div className="text-sm font-medium leading-none">{isRTL ? "تسعير الجملة" : "Wholesale"}</div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          {isRTL
                            ? "خصومات خاصة للطلبات الكبيرة"
                            : "Special discounts for bulk orders"}
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href="/editor"
                    className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                  >
                    {isRTL ? "محرر التصميم" : "Design Editor"}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href="/templates"
                    className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                  >
                    {isRTL ? "قوالب" : "Templates"}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href="/brief"
                    className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                  >
                    {isRTL ? "إرسال طلب مخصص" : "Send Brief"}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href="/b2b"
                    className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                  >
                    {t("nav.b2b")}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href="/about"
                    className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                  >
                    {t("nav.about")}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href="/contact"
                    className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                  >
                    {t("nav.contact")}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Right side actions */}
          <div className={`flex items-center space-x-1 sm:space-x-2 2xl:space-x-4 ${isRTL ? "space-x-reverse" : ""}`}>
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Cart */}
            <Button asChild variant="ghost" size="sm" className="relative">
              <Link href="/cart">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <Badge className={`absolute -top-2 ${isRTL ? "-left-2" : "-right-2"} h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs`}>
                    {itemCount}
                  </Badge>
                )}
              </Link>
            </Button>

            {/* User Menu or Auth Buttons */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    className={`flex items-center space-x-2 cursor-pointer ${isRTL ? "space-x-reverse" : ""}`}
                  >
                    <User className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline-block whitespace-nowrap max-w-[150px] truncate">
                      {(() => {
                        let displayName = user.name || user.email?.split("@")[0] || (isRTL ? "المستخدم" : "User")
                        // Remove "Manufacturer User" or "User" and replace with email name
                        if (displayName === "Manufacturer User" || displayName === "Trader User") {
                          displayName = user.email?.split("@")[0] || displayName
                        }
                        // Capitalize first letter
                        if (typeof displayName === 'string' && displayName.length > 0) {
                          displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1)
                        }
                        return displayName
                      })()}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRTL ? "start" : "end"}>
                  <DropdownMenuLabel>{isRTL ? "حسابي" : "My Account"}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                      {isRTL ? "الملف الشخصي" : "Profile"}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/orders">
                      <ShoppingCart className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                      {isRTL ? "طلباتي" : "My Orders"}
                    </Link>
                  </DropdownMenuItem>
                  {user.role === "ADMIN" && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/admin">
                          <Settings className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                          {isRTL ? "لوحة الإدارة" : "Admin Dashboard"}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/analytics">
                          <Settings className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                          {isRTL ? "التحليلات" : "Analytics"}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/inventory">
                          <Package className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                          {isRTL ? "إدارة المخزون" : "Inventory"}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {user.role === "MANUFACTURER" && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/manufacturer">
                          <Building2 className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                          {isRTL ? "لوحة التحكم" : "Manufacturer Dashboard"}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/manufacturer/products">
                          <Package className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                          {isRTL ? "المنتجات" : "Products"}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/manufacturer/orders">
                          <ShoppingCart className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                          {isRTL ? "الطلبات" : "Orders"}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/manufacturer/quotes">
                          <FileText className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                          {isRTL ? "عروض الأسعار" : "Quotes"}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/b2b">
                          <Building2 className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                          {isRTL ? "بوابة B2B" : "B2B Portal"}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/security">
                      <Shield className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                      {isRTL ? "الأمان" : "Security"}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                    {isRTL ? "تسجيل الخروج" : "Logout"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className={`hidden sm:flex items-center space-x-2 ${isRTL ? "space-x-reverse" : ""}`}>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">{t("nav.login")}</Link>
                </Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" asChild>
                  <Link href="/signup">{t("nav.register")}</Link>
                </Button>
              </div>
            )}

            {/* Contact Button */}
            <Button asChild className="hidden 2xl:flex bg-emerald-600 hover:bg-emerald-700">
              <Link href="/contact">
                <Phone className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                {isRTL ? "احصل على عرض سعر" : "Get Quote"}
              </Link>
            </Button>

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="xl:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side={isRTL ? "left" : "right"} className="w-[300px] sm:w-[400px]">
                <nav className={`flex flex-col space-y-4 mt-8 px-6 ${isRTL ? "text-right" : ""}`}>
                  <Link href="/products" className="text-lg font-medium" onClick={() => setIsOpen(false)}>
                    {t("nav.products")}
                  </Link>
                  <Link href="/b2b" className="text-lg font-medium" onClick={() => setIsOpen(false)}>
                    {t("nav.b2b")}
                  </Link>
                  <Link href="/editor" className="text-lg font-medium" onClick={() => setIsOpen(false)}>
                    {isRTL ? "محرر التصميم" : "Design Editor"}
                  </Link>

                  <Link href="/about" className="text-lg font-medium" onClick={() => setIsOpen(false)}>
                    {t("nav.about")}
                  </Link>
                  <Link href="/blog" className="text-lg font-medium" onClick={() => setIsOpen(false)}>
                    {t("nav.blog")}
                  </Link>
                  <Link href="/contact" className="text-lg font-medium" onClick={() => setIsOpen(false)}>
                    {t("nav.contact")}
                  </Link>
                  {!user && (
                    <>
                      <Link href="/login" className="text-lg font-medium" onClick={() => setIsOpen(false)}>
                        {t("nav.login")}
                      </Link>
                      <Link href="/signup" className="text-lg font-medium" onClick={() => setIsOpen(false)}>
                        {t("nav.register")}
                      </Link>
                    </>
                  )}
                  <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                    <Link href="/contact" onClick={() => setIsOpen(false)}>
                      {isRTL ? "احصل على عرض سعر" : "Get Quote"}
                    </Link>
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
