import type { ReactNode } from "react"
import { CustomerSidebar } from "@/components/customer/sidebar"

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 md:flex-row">
      <CustomerSidebar />
      <main className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  )
}
