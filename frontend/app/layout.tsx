import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { CartProvider } from "@/providers/cart-provider"
import { AuthProvider } from "@/providers/auth-provider"
import { QueryProvider } from "@/providers/query-provider"
import { LanguageProvider } from "@/providers/language-provider"
import { SecurityProvider } from "@/providers/security-provider"
import { LiveChat } from "@/components/features/live-chat"
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "PackagePro - حلول التغليف المخصصة | Custom Packaging Solutions",
  description:
    "حلول تغليف متميزة للشركات والمناسبات. تصاميم مخصصة، مواد صديقة للبيئة، وخدمة موثوقة | Premium packaging solutions for businesses and events",
  keywords: "تغليف, تغليف مخصص, كرتون مضلع, أكواب ورقية, علب هدايا, تغليف الشركات, تغليف المناسبات",
  generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var lang = localStorage.getItem('language');
                if (lang === 'ar') {
                  document.documentElement.lang = 'ar';
                  document.documentElement.dir = 'rtl';
                }
              } catch(e) {}
            })();
          `
        }} />
      </head>
      <body className={inter.className}>
        <SecurityProvider>
          <LanguageProvider>
            <AuthProvider>
              <QueryProvider>
                <CartProvider>
                  <AnalyticsProvider>
                    <Navbar />
                    <main>{children}</main>
                    <Footer />
                    <LiveChat />
                    <Toaster />
                  </AnalyticsProvider>
                </CartProvider>
              </QueryProvider>
            </AuthProvider>
          </LanguageProvider>
        </SecurityProvider>
      </body>
    </html>
  )
}
