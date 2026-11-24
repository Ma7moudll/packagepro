import type { ReactNode } from "react"
import { VendorSidebar } from "@/components/vendor/sidebar"

export default function BusinessLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <VendorSidebar />
      <main className="min-w-0 w-full flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
