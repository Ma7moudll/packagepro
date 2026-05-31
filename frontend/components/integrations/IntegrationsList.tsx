"use client"

import { useState, useEffect } from "react"
import { useIntegrationStore } from "@/lib/integrations/integration-store"
import { IntegrationService } from "@/lib/integrations/integration-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { Integration, IntegrationProvider } from "@/lib/integrations/types"
import { ConnectIntegrationForm } from "./ConnectIntegrationForm"

const PROVIDER_INFO: Record<IntegrationProvider, { name: string; icon: string; color: string }> = {
  shopify: { name: "Shopify", icon: "🛍️", color: "bg-emerald-500" },
  woocommerce: { name: "WooCommerce", icon: "🛒", color: "bg-blue-500" },
  etsy: { name: "Etsy", icon: "🎨", color: "bg-orange-500" },
  printful: { name: "Printful", icon: "🖨️", color: "bg-purple-500" },
  gooten: { name: "Gooten", icon: "📦", color: "bg-indigo-500" },
  mailchimp: { name: "Mailchimp", icon: "📧", color: "bg-yellow-500" },
  hubspot: { name: "HubSpot", icon: "🎯", color: "bg-pink-500" },
  salesforce: { name: "Salesforce", icon: "☁️", color: "bg-cyan-500" },
  zoho: { name: "Zoho", icon: "📊", color: "bg-red-500" },
  "google-drive": { name: "Google Drive", icon: "📁", color: "bg-blue-500" },
  dropbox: { name: "Dropbox", icon: "📂", color: "bg-blue-600" },
}

export function IntegrationsList() {
  const { language } = useLanguage()
  const { integrations, setIntegrations, removeIntegration } = useIntegrationStore()
  const integrationService = new IntegrationService()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadIntegrations()
  }, [])

  const loadIntegrations = async () => {
    try {
      setLoading(true)
      const data = await integrationService.getIntegrations()
      setIntegrations(data)
    } catch (error) {
      console.error("Error loading integrations:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async (id: string) => {
    try {
      await integrationService.disconnectIntegration(id)
      removeIntegration(id)
    } catch (error) {
      console.error("Error disconnecting integration:", error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <XCircle className="h-4 w-4 text-slate-400" />
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {language === "ar" ? "التكاملات" : "Integrations"}
        </h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {language === "ar" ? "إضافة تكامل" : "Add Integration"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {language === "ar" ? "ربط تكامل جديد" : "Connect New Integration"}
              </DialogTitle>
            </DialogHeader>
            <ConnectIntegrationForm onSuccess={loadIntegrations} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-slate-500">
            {language === "ar" ? "جارٍ التحميل..." : "Loading..."}
          </p>
        </div>
      ) : integrations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">
            {language === "ar" ? "لا توجد تكاملات" : "No integrations yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((integration) => {
            const providerInfo = PROVIDER_INFO[integration.provider]
            return (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className="text-2xl">{providerInfo.icon}</span>
                      {providerInfo.name}
                    </CardTitle>
                    {getStatusIcon(integration.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        integration.status === "connected"
                          ? "default"
                          : integration.status === "error"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {integration.status}
                    </Badge>
                  </div>

                  {integration.lastSync && (
                    <p className="text-xs text-slate-500">
                      {language === "ar" ? "آخر مزامنة" : "Last Sync"}:{" "}
                      {new Date(integration.lastSync).toLocaleString()}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      asChild
                    >
                      <a href={`/integrations/${integration.id}`}>
                        {language === "ar" ? "إدارة" : "Manage"}
                      </a>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDisconnect(integration.id)}
                    >
                      {language === "ar" ? "قطع الاتصال" : "Disconnect"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

