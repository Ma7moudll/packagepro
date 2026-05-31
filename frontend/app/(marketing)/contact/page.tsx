import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Phone, Mail, MapPin, Clock, MessageSquare } from "lucide-react"

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">Get in Touch</h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          Have a question? We&apos;d love to hear from you.r packaging solutions? Need a custom quote? We&apos;re here to help you find the perfect
          packaging for your needs.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Contact Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Send us a Message</CardTitle>
              <CardDescription>We&apos;re here to help! Send us a message and we&apos;ll get back to you as soon as possible.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" placeholder="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" placeholder="Doe" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" placeholder="+1 (555) 123-4567" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company (Optional)</Label>
                <Input id="company" placeholder="Your Company Name" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inquiry-type">Inquiry Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="What can we help you with?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quote">Request a Quote</SelectItem>
                    <SelectItem value="customization">Custom Design Inquiry</SelectItem>
                    <SelectItem value="bulk-order">Bulk Order</SelectItem>
                    <SelectItem value="product-info">Product Information</SelectItem>
                    <SelectItem value="support">Customer Support</SelectItem>
                    <SelectItem value="partnership">Partnership Opportunity</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us about your packaging needs, quantity requirements, timeline, or any other details..."
                  rows={6}
                />
              </div>

              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Send Message</Button>
            </CardContent>
          </Card>
        </div>

        {/* Contact Information */}
        <div className="space-y-6">
          {/* Contact Details */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Phone className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium">Phone</p>
                  <p className="text-slate-600">+1 (555) 123-4567</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-slate-600">info@packagepro.com</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Address</p>
                  <p className="text-slate-600">
                    123 Business Street
                    <br />
                    City, State 12345
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">WhatsApp</p>
                  <p className="text-slate-600">+1 (555) 123-4567</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Business Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Monday - Friday</span>
                <span className="font-medium">8:00 AM - 6:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Saturday</span>
                <span className="font-medium">9:00 AM - 4:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Sunday</span>
                <span className="font-medium">Closed</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-emerald-50 border-emerald-200">
            <CardHeader>
              <CardTitle>Need Immediate Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-emerald-800 text-sm">
                For urgent inquiries or immediate assistance, use one of these quick options:
              </p>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">WhatsApp Us Now</Button>
              <Button variant="outline" className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-100">
                Schedule a Call
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-16">
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>Quick answers to common questions about our packaging solutions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2">What&apos;s the minimum order quantity?</h4>
              <p className="text-slate-600">
                Minimum order quantities vary by product. For B2B orders, it&apos;s typically 100-1000 pieces. For events, we
                can accommodate smaller orders starting from 25 pieces.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">How long does customization take?</h4>
              <p className="text-slate-600">
                Standard customization takes 5-7 business days after design approval. Rush orders can be completed in
                2-3 business days for an additional fee.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Do you offer international shipping?</h4>
              <p className="text-slate-600">
                Yes, we ship internationally. Shipping costs and delivery times vary by destination. Contact us for a
                shipping quote to your location.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">What file formats do you accept for custom designs?</h4>
              <p className="text-slate-600">
                We accept AI, EPS, PDF, PNG, and JPG files. For best results, provide vector files (AI or EPS) with at
                least 300 DPI resolution.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
