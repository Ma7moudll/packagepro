"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FileText, Upload, CheckCircle, ArrowRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function BriefPage() {
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    productType: "",
    quantity: "",
    dimensions: "",
    material: "",
    colors: "",
    deadline: "",
    budget: "",
    description: "",
    attachments: [] as File[],
  })

  const handleInputChange = (field: string, value: string | File[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      setFormData((prev) => ({
        ...prev,
        attachments: [...prev.attachments, ...files],
      }))
      toast({
        title: "Files uploaded",
        description: `${files.length} file(s) uploaded successfully`,
      })
    }
  }

  const handleSubmit = async () => {
    try {
      // Here you would send the brief to the backend
      toast({
        title: "Brief submitted!",
        description: "We'll review your request and get back to you within 24 hours.",
      })
      // Reset form
      setFormData({
        companyName: "",
        contactName: "",
        email: "",
        phone: "",
        productType: "",
        quantity: "",
        dimensions: "",
        material: "",
        colors: "",
        deadline: "",
        budget: "",
        description: "",
        attachments: [],
      })
      setStep(1)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit brief. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-purple-100 text-purple-800">Custom Request</Badge>
        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
          Need something else? Send us a brief
        </h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          Can't find what you're looking for? Fill out our brief form and our team will help you create the perfect
          custom packaging solution.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center space-x-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= s ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                {step > s ? <CheckCircle className="h-5 w-5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 h-1 ${step > s ? "bg-emerald-600" : "bg-slate-200"}`}
                  style={{ margin: "0 8px" }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Step {step} of 3</CardTitle>
            <CardDescription>
              {step === 1 && "Tell us about your company and contact information"}
              {step === 2 && "Describe your packaging needs"}
              {step === 3 && "Review and submit your brief"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange("companyName", e.target.value)}
                    placeholder="Your company name"
                    className="mt-2"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactName">Contact Name *</Label>
                    <Input
                      id="contactName"
                      value={formData.contactName}
                      onChange={(e) => handleInputChange("contactName", e.target.value)}
                      placeholder="Your full name"
                      className="mt-2"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="+20 123 456 7890"
                      className="mt-2"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="you@company.com"
                    className="mt-2"
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setStep(2)} disabled={!formData.companyName || !formData.email}>
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="productType">Product Type *</Label>
                  <Select value={formData.productType} onValueChange={(value) => handleInputChange("productType", value)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select product type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boxes">Boxes</SelectItem>
                      <SelectItem value="bags">Bags</SelectItem>
                      <SelectItem value="cups">Cups</SelectItem>
                      <SelectItem value="tubes">Tubes</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      value={formData.quantity}
                      onChange={(e) => handleInputChange("quantity", e.target.value)}
                      placeholder="e.g., 5000"
                      className="mt-2"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => handleInputChange("deadline", e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="dimensions">Dimensions (Length × Width × Height in mm)</Label>
                  <Input
                    id="dimensions"
                    value={formData.dimensions}
                    onChange={(e) => handleInputChange("dimensions", e.target.value)}
                    placeholder="e.g., 200 × 150 × 100"
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="material">Material Preference</Label>
                    <Select value={formData.material} onValueChange={(value) => handleInputChange("material", value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kraft">Kraft Paper</SelectItem>
                        <SelectItem value="corrugated">Corrugated</SelectItem>
                        <SelectItem value="cardboard">Cardboard</SelectItem>
                        <SelectItem value="recycled">Recycled</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="budget">Budget Range</Label>
                    <Select value={formData.budget} onValueChange={(value) => handleInputChange("budget", value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select budget" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under-1000">Under 1,000 EGP</SelectItem>
                        <SelectItem value="1000-5000">1,000 - 5,000 EGP</SelectItem>
                        <SelectItem value="5000-10000">5,000 - 10,000 EGP</SelectItem>
                        <SelectItem value="10000+">10,000+ EGP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="colors">Colors / Brand Guidelines</Label>
                  <Textarea
                    id="colors"
                    value={formData.colors}
                    onChange={(e) => handleInputChange("colors", e.target.value)}
                    placeholder="Describe your brand colors, style, or attach brand guidelines"
                    className="mt-2"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Additional Details</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Tell us more about your requirements, special features, or any other details..."
                    className="mt-2"
                    rows={5}
                  />
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Previous
                  </Button>
                  <Button onClick={() => setStep(3)} disabled={!formData.productType || !formData.quantity}>
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="attachments">Attach Files (Optional)</Label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center mt-2">
                    <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                    <Input
                      type="file"
                      id="attachments"
                      multiple
                      accept=".pdf,.ai,.eps,.jpg,.png"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById("attachments")?.click()}
                      className="mt-4"
                    >
                      Choose Files
                    </Button>
                    <p className="text-sm text-slate-500 mt-2">
                      Supported: PDF, AI, EPS, JPG, PNG (Max 10MB per file)
                    </p>
                    {formData.attachments.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {formData.attachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                            <FileText className="h-4 w-4 mr-2" />
                            <span className="text-sm flex-1">{file.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newAttachments = [...formData.attachments]
                                newAttachments.splice(index, 1)
                                handleInputChange("attachments", newAttachments)
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Summary */}
                <div className="bg-slate-50 rounded-lg p-6 space-y-3">
                  <h3 className="font-semibold text-lg mb-4">Review Your Brief</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Company:</span>
                      <span className="ml-2 font-medium">{formData.companyName}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Contact:</span>
                      <span className="ml-2 font-medium">{formData.contactName}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Email:</span>
                      <span className="ml-2 font-medium">{formData.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Phone:</span>
                      <span className="ml-2 font-medium">{formData.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Product Type:</span>
                      <span className="ml-2 font-medium">{formData.productType}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Quantity:</span>
                      <span className="ml-2 font-medium">{formData.quantity}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Previous
                  </Button>
                  <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700">
                    Submit Brief
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-slate-600 mb-4">Need help? Our team is here to assist you.</p>
          <div className="flex justify-center gap-4">
            <Link href="/contact">
              <Button variant="outline">Contact Support</Button>
            </Link>
            <Link href="/products">
              <Button variant="outline">Browse Products</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

