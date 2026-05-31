"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/providers/auth-provider"
import { useLanguage } from "@/providers/language-provider"
import { FileText, Send, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

export default function ManufacturerQuotesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { language } = useLanguage()
  const { toast } = useToast()
  interface Quote {
    id: string
    customer: string
    customerEn: string
    product: string
    productEn: string
    status: string
    date: string
    specifications: string
  }
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false)
  const [quoteForm, setQuoteForm] = useState({
    price: "",
    deliveryTime: "",
    notes: "",
  })

  useEffect(() => {
    if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
      router.push("/login")
      return
    }

    // Fetch quote requests
    const fetchQuotes = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500))
        setQuotes([
          {
            id: "RFQ-1001",
            customer: "شركة الأهرام",
            customerEn: "Al-Ahram Company",
            product: "علب كرتون مموج - 1000 قطعة",
            productEn: "Corrugated Boxes - 1000 pieces",
            status: "pending",
            date: "2024-01-15",
            specifications: "علب بقياس 30x30x20 سم، طباعة مخصصة",
          },
          {
            id: "RFQ-1002",
            customer: "مطعم النيل",
            customerEn: "Nile Restaurant",
            product: "أكياس ورق كرافت - 5000 قطعة",
            productEn: "Kraft Paper Bags - 5000 pieces",
            status: "pending",
            date: "2024-01-14",
            specifications: "أكياس بيد قوية مع مقابض، حجم كبير",
          },
        ])
      } catch (error) {
        console.error("Error fetching quotes:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchQuotes()
  }, [user, router])

  const handleSubmitQuote = async () => {
    if (!quoteForm.price || !quoteForm.deliveryTime) {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? "يرجى إدخال السعر ووقت التسليم" : "Please enter price and delivery time",
        variant: "destructive",
      })
      return
    }

    try {
      // Submit quote logic
      await new Promise((resolve) => setTimeout(resolve, 500))
      // Update quote status
      setQuotes((prev) =>
        prev.map((q) => (q.id === selectedQuote?.id ? { ...q, status: "responded" } : q))
      )
      setQuoteDialogOpen(false)
      setQuoteForm({ price: "", deliveryTime: "", notes: "" })
      setSelectedQuote(null)
      toast({
        title: language === "ar" ? "تم الإرسال" : "Sent",
        description: language === "ar" ? "تم إرسال عرض السعر بنجاح" : "Quote sent successfully",
      })
    } catch (error) {
      console.error("Error submitting quote:", error)
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? "حدث خطأ في إرسال العرض" : "Error sending quote",
        variant: "destructive",
      })
    }
  }

  const handleRejectQuote = (quoteId: string) => {
    setQuotes((prev) => prev.filter((q) => q.id !== quoteId))
    toast({
      title: language === "ar" ? "تم الرفض" : "Rejected",
      description: language === "ar" ? "تم رفض طلب عرض السعر" : "Quote request rejected",
    })
  }

  if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          {language === "ar" ? "عروض الأسعار" : "Quote Requests"}
        </h1>
        <p className="text-slate-600">
          {language === "ar" ? "إدارة طلبات عروض الأسعار من العملاء" : "Manage quote requests from customers"}
        </p>
      </div>

      {/* Quotes List */}
      <div className="space-y-4">
        {quotes.map((quote) => (
          <Card key={quote.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="text-lg font-semibold">{quote.id}</h3>
                    <Badge variant={quote.status === "pending" ? "secondary" : "default"}>
                      {quote.status === "pending"
                        ? language === "ar"
                          ? "قيد الانتظار"
                          : "Pending"
                        : language === "ar"
                          ? "تم الرد"
                          : "Responded"}
                    </Badge>
                  </div>
                  <p className="text-slate-600 mb-2">
                    {language === "ar" ? quote.customer : quote.customerEn}
                  </p>
                  <p className="font-medium mb-2">
                    {language === "ar" ? quote.product : quote.productEn}
                  </p>
                  <p className="text-sm text-slate-500 mb-2">{quote.specifications}</p>
                  <p className="text-xs text-slate-400">{quote.date}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setSelectedQuote(quote)
                      setQuoteDialogOpen(true)
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {language === "ar" ? "إرسال عرض" : "Submit Quote"}
                  </Button>
                  <Button variant="outline" onClick={() => handleRejectQuote(quote.id)}>
                    <X className="h-4 w-4 mr-2" />
                    {language === "ar" ? "رفض" : "Reject"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {quotes.length === 0 && !loading && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">
            {language === "ar" ? "لا توجد طلبات عروض أسعار" : "No quote requests found"}
          </p>
        </div>
      )}

      {/* Quote Dialog */}
      <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === "ar" ? "إرسال عرض سعر" : "Submit Quote"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{language === "ar" ? "السعر (جنيه)" : "Price (EGP)"}</Label>
              <Input
                type="number"
                value={quoteForm.price}
                onChange={(e) => setQuoteForm({ ...quoteForm, price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>
                {language === "ar" ? "وقت التسليم (أيام)" : "Delivery Time (days)"}
              </Label>
              <Input
                type="number"
                value={quoteForm.deliveryTime}
                onChange={(e) => setQuoteForm({ ...quoteForm, deliveryTime: e.target.value })}
                placeholder="7"
              />
            </div>
            <div>
              <Label>{language === "ar" ? "ملاحظات" : "Notes"}</Label>
              <Textarea
                value={quoteForm.notes}
                onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                placeholder={language === "ar" ? "ملاحظات إضافية..." : "Additional notes..."}
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setQuoteDialogOpen(false)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={handleSubmitQuote}>
                <Send className="h-4 w-4 mr-2" />
                {language === "ar" ? "إرسال" : "Submit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

