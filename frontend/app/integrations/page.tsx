"use client"

import { IntegrationsList } from "@/components/integrations/IntegrationsList"

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <h1 className="text-3xl font-bold mb-8">Integrations</h1>
        <IntegrationsList />
      </div>
    </div>
  )
}
