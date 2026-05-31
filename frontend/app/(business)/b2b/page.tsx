"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Building2, Package, Calculator, Clock, Award } from "lucide-react"
import { useAuth } from "@/providers/auth-provider"
import { useLanguage } from "@/providers/language-provider"
import { useToast } from "@/hooks/use-toast"

export default function B2BPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { language } = useLanguage()
  const { toast } = useToast()

  // Authentication check removed to allow public access to the B2B landing page
  // Functionality requiring auth can be protected inside specific actions

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-blue-100 text-blue-800">B2B Solutions</Badge>
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">Business Packaging Solutions</h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          Streamline your business operations with our bulk packaging solutions. From restaurants to retail stores, we
          provide quality packaging at competitive prices.
        </p>
      </div>

      {/* Benefits Section */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Card className="text-center">
          <CardHeader>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Bulk Pricing</CardTitle>
            <CardDescription>Competitive rates for large quantity orders with volume discounts</CardDescription>
          </CardHeader>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Fast Delivery</CardTitle>
            <CardDescription>Quick turnaround times to keep your business running smoothly</CardDescription>
          </CardHeader>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
            <CardTitle>Quality Guarantee</CardTitle>
            <CardDescription>ISO certified materials and processes for consistent quality</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Quote Request Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="mr-2 h-5 w-5" />
              Request a Quote
            </CardTitle>
            <CardDescription>
              Fill out the form below and we&apos;ll get back to you with a competitive quote within 24 hours.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company Name *</Label>
                <Input id="company" placeholder="Your Company" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Contact Person *</Label>
                <Input id="contact" placeholder="Full Name" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="business@company.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" placeholder="+1 (555) 123-4567" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business-type">Business Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select your business type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="cafe">Cafe</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="retail">Retail Store</SelectItem>
                  <SelectItem value="ecommerce">E-commerce</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="products">Products Needed</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select product category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrugated">Corrugated Boxes</SelectItem>
                  <SelectItem value="cups">Paper Cups</SelectItem>
                  <SelectItem value="bags">Shopping Bags</SelectItem>
                  <SelectItem value="coasters">Coasters</SelectItem>
                  <SelectItem value="multiple">Multiple Products</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Estimated Quantity</Label>
                <Input id="quantity" placeholder="e.g., 10,000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Order Frequency</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="How often?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-time">One-time order</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="as-needed">As needed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements">Special Requirements</Label>
              <Textarea
                id="requirements"
                placeholder="Tell us about customization needs, branding requirements, delivery preferences, etc."
                rows={4}
              />
            </div>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                toast({
                  title: language === "ar" ? "تم الإرسال" : "Sent",
                  description: language === "ar"
                    ? "سيتم التواصل معك خلال 24 ساعة"
                    : "We'll contact you within 24 hours",
                })
              }}
            >
              {language === "ar" ? "طلب عرض سعر" : "Request Quote"}
            </Button>
          </CardContent>
        </Card>

        {/* Business Benefits */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="mr-2 h-5 w-5" />
                Why Choose Our B2B Solutions?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div>
                  <h4 className="font-semibold">Volume Discounts</h4>
                  <p className="text-slate-600 text-sm">
                    Save more with larger orders. Our tiered pricing ensures better rates for bulk purchases.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div>
                  <h4 className="font-semibold">Custom Branding</h4>
                  <p className="text-slate-600 text-sm">
                    Add your logo, colors, and branding to create a cohesive brand experience.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div>
                  <h4 className="font-semibold">Flexible Payment Terms</h4>
                  <p className="text-slate-600 text-sm">
                    Net 30 payment terms available for qualified businesses with credit approval.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div>
                  <h4 className="font-semibold">Dedicated Account Manager</h4>
                  <p className="text-slate-600 text-sm">
                    Get personalized service with a dedicated account manager for all your packaging needs.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Popular B2B Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="font-medium">Corrugated Shipping Boxes</span>
                <Badge variant="secondary">From $2.50</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="font-medium">Custom Paper Cups</span>
                <Badge variant="secondary">From $0.35</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="font-medium">Branded Shopping Bags</span>
                <Badge variant="secondary">From $1.25</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="font-medium">Custom Coasters</span>
                <Badge variant="secondary">From $0.75</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-blue-900 mb-2">Need Help Choosing?</h3>
              <p className="text-blue-800 text-sm mb-4">
                Our packaging experts are here to help you find the perfect solution for your business needs.
              </p>
              <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                Schedule Consultation
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
