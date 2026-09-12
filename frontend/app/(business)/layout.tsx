import type { ReactNode } from "react"
import { VendorSidebar } from "@/components/vendor/sidebar"

export default function BusinessLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <VendorSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
