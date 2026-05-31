"use client"

import { useState } from "react"
import { IntegrationService } from "@/lib/integrations/integration-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useLanguage } from "@/providers/language-provider"
import { IntegrationProvider } from "@/lib/integrations/types"

interface ConnectIntegrationFormProps {
  onSuccess: () => void
}

export function ConnectIntegrationForm({ onSuccess }: ConnectIntegrationFormProps) {
  const { language } = useLanguage()
  const integrationService = new IntegrationService()
  const [provider, setProvider] = useState<IntegrationProvider>("shopify")
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await integrationService.connectIntegration(provider, credentials)
      onSuccess()
    } catch (err: any) {
      setError(err.message || (language === "ar" ? "حدث خطأ" : "An error occurred"))
    } finally {
      setLoading(false)
    }
  }

  const getCredentialFields = () => {
    switch (provider) {
      case "shopify":
        return (
          <>
            <div>
              <Label>
                {language === "ar" ? "رابط المتجر" : "Store URL"} *
              </Label>
              <Input
                value={credentials.storeUrl || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, storeUrl: e.target.value })
                }
                placeholder="mystore.myshopify.com"
                required
              />
            </div>
            <div>
              <Label>
                {language === "ar" ? "API Key" : "API Key"} *
              </Label>
              <Input
                type="password"
                value={credentials.apiKey || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, apiKey: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label>
                {language === "ar" ? "API Secret" : "API Secret"} *
              </Label>
              <Input
                type="password"
                value={credentials.apiSecret || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, apiSecret: e.target.value })
                }
                required
              />
            </div>
          </>
        )
      case "woocommerce":
        return (
          <>
            <div>
              <Label>
                {language === "ar" ? "رابط المتجر" : "Store URL"} *
              </Label>
              <Input
                value={credentials.storeUrl || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, storeUrl: e.target.value })
                }
                placeholder="https://example.com"
                required
              />
            </div>
            <div>
              <Label>
                {language === "ar" ? "Consumer Key" : "Consumer Key"} *
              </Label>
              <Input
                type="password"
                value={credentials.apiKey || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, apiKey: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label>
                {language === "ar" ? "Consumer Secret" : "Consumer Secret"} *
              </Label>
              <Input
                type="password"
                value={credentials.apiSecret || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, apiSecret: e.target.value })
                }
                required
              />
            </div>
          </>
        )
      case "etsy":
        return (
          <>
            <div>
              <Label>
                {language === "ar" ? "API Key" : "API Key"} *
              </Label>
              <Input
                type="password"
                value={credentials.apiKey || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, apiKey: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label>
                {language === "ar" ? "Shared Secret" : "Shared Secret"} *
              </Label>
              <Input
                type="password"
                value={credentials.apiSecret || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, apiSecret: e.target.value })
                }
                required
              />
            </div>
          </>
        )
      case "printful":
      case "gooten":
        return (
          <>
            <div>
              <Label>
                {language === "ar" ? "API Key" : "API Key"} *
              </Label>
              <Input
                type="password"
                value={credentials.apiKey || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, apiKey: e.target.value })
                }
                required
              />
            </div>
          </>
        )
      case "mailchimp":
        return (
          <>
            <div>
              <Label>
                {language === "ar" ? "API Key" : "API Key"} *
              </Label>
              <Input
                type="password"
                value={credentials.apiKey || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, apiKey: e.target.value })
                }
                required
              />
            </div>
          </>
        )
      case "hubspot":
      case "salesforce":
      case "zoho":
        return (
          <>
            <div>
              <Label>
                {language === "ar" ? "Access Token" : "Access Token"} *
              </Label>
              <Input
                type="password"
                value={credentials.accessToken || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, accessToken: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label>
                {language === "ar" ? "Refresh Token" : "Refresh Token"} (اختياري)
              </Label>
              <Input
                type="password"
                value={credentials.refreshToken || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, refreshToken: e.target.value })
                }
              />
            </div>
          </>
        )
      default:
        return null
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>
          {language === "ar" ? "مزود الخدمة" : "Provider"} *
        </Label>
        <Select value={provider} onValueChange={(v) => setProvider(v as IntegrationProvider)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="shopify">Shopify</SelectItem>
            <SelectItem value="woocommerce">WooCommerce</SelectItem>
            <SelectItem value="etsy">Etsy</SelectItem>
            <SelectItem value="printful">Printful</SelectItem>
            <SelectItem value="gooten">Gooten</SelectItem>
            <SelectItem value="mailchimp">Mailchimp</SelectItem>
            <SelectItem value="hubspot">HubSpot</SelectItem>
            <SelectItem value="salesforce">Salesforce</SelectItem>
            <SelectItem value="zoho">Zoho</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {getCredentialFields()}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? language === "ar"
            ? "جارٍ الربط..."
            : "Connecting..."
          : language === "ar"
            ? "ربط"
            : "Connect"}
      </Button>
    </form>
  )
}

