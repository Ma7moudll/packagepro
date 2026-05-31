import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, Phone, Mail, Clock, FileText, Download, Video, BookOpen, Headphones } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function SupportPage() {
  const supportArticles = [
    {
      title: "How to Place Your First Order",
      category: "Getting Started",
      readTime: "3 min",
      views: "1.2k",
    },
    {
      title: "Understanding Our Pricing Structure",
      category: "Billing",
      readTime: "5 min",
      views: "856",
    },
    {
      title: "Custom Design Guidelines",
      category: "Design",
      readTime: "7 min",
      views: "2.1k",
    },
    {
      title: "Shipping and Delivery Information",
      category: "Shipping",
      readTime: "4 min",
      views: "934",
    },
  ]

  const videoTutorials = [
    {
      title: "Getting Started with PackagePro",
      duration: "5:32",
      thumbnail: "/placeholder.svg?height=120&width=200",
    },
    {
      title: "How to Upload Custom Designs",
      duration: "3:45",
      thumbnail: "/placeholder.svg?height=120&width=200",
    },
    {
      title: "Managing Your Orders",
      duration: "4:18",
      thumbnail: "/placeholder.svg?height=120&width=200",
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-blue-100 text-blue-800">Support Center</Badge>
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">How Can We Help You?</h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          Find answers, get support, and learn how to make the most of our packaging solutions.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <MessageSquare className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Live Chat</h3>
            <p className="text-slate-600 mb-4">Get instant help from our support team</p>
            <Button className="w-full">Start Chat</Button>
          </CardContent>
        </Card>

        <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <Phone className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Call Support</h3>
            <p className="text-slate-600 mb-4">Speak directly with our experts</p>
            <Button variant="outline" className="w-full">
              +1 (555) 123-4567
            </Button>
          </CardContent>
        </Card>

        <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <Mail className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Email Support</h3>
            <p className="text-slate-600 mb-4">Send us a detailed message</p>
            <Button variant="outline" className="w-full">
              support@packagepro.com
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="contact" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="contact">Contact Us</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
          <TabsTrigger value="tutorials">Video Tutorials</TabsTrigger>
          <TabsTrigger value="downloads">Downloads</TabsTrigger>
        </TabsList>

        {/* Contact Form */}
        <TabsContent value="contact">
          <div className="grid lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Submit a Support Request</CardTitle>
                <CardDescription>Fill out the form and we&apos;ll get back to you within 24 hours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a topic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="order">Order Issue</SelectItem>
                      <SelectItem value="billing">Billing Question</SelectItem>
                      <SelectItem value="technical">Technical Support</SelectItem>
                      <SelectItem value="design">Design Help</SelectItem>
                      <SelectItem value="shipping">Shipping Inquiry</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="Please describe your issue in detail..." rows={6} />
                </div>

                <Button className="w-full">Submit Request</Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {/* Support Hours */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    Support Hours
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Monday - Friday</span>
                    <span className="font-medium">8:00 AM - 8:00 PM EST</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday</span>
                    <span className="font-medium">9:00 AM - 5:00 PM EST</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday</span>
                    <span className="font-medium">Closed</span>
                  </div>
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      <span className="font-medium">Current Status:</span> We&apos;re online and ready to help!
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Headphones className="mr-2 h-5 w-5" />
                    Emergency Support
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 mb-4">For urgent production issues or time-sensitive orders:</p>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Phone className="mr-2 h-4 w-4" />
                      Emergency Hotline: +1 (555) 911-PACK
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      WhatsApp: +1 (555) 123-4567
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Knowledge Base */}
        <TabsContent value="knowledge">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Knowledge Base</h2>
              <div className="max-w-md mx-auto">
                <Input placeholder="Search articles..." className="w-full" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {supportArticles.map((article, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <Badge variant="secondary" className="w-fit">
                      {article.category}
                    </Badge>
                    <CardTitle className="text-lg">{article.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>{article.readTime}</span>
                      <span>{article.views} views</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Button variant="outline" asChild>
                <Link href="/faq">
                  <BookOpen className="mr-2 h-4 w-4" />
                  View All Articles
                </Link>
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Video Tutorials */}
        <TabsContent value="tutorials">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Video Tutorials</h2>
              <p className="text-slate-600">Learn how to use our platform with step-by-step video guides</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videoTutorials.map((video, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="relative">
                    <Image
                      src={video.thumbnail || "/placeholder.svg"}
                      alt={video.title}
                      fill
                      className="object-cover rounded-t-lg"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <Video className="h-6 w-6 text-slate-700" />
                      </div>
                    </div>
                    <Badge className="absolute bottom-2 right-2 bg-black/80 text-white shadow-lg">{video.duration}</Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold">{video.title}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Downloads */}
        <TabsContent value="downloads">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Downloads & Resources</h2>
              <p className="text-slate-600">Templates, guides, and tools to help you succeed</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Design Templates</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Ready-to-use design templates for various packaging types
                  </p>
                  <Button variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download (2.3 MB)
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Size Guide</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Complete guide to packaging dimensions and specifications
                  </p>
                  <Button variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download (1.8 MB)
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Brand Guidelines</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Best practices for incorporating your brand into packaging
                  </p>
                  <Button variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download (3.1 MB)
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Sustainability Report</h3>
                  <p className="text-sm text-slate-600 mb-4">Our commitment to environmental responsibility</p>
                  <Button variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download (4.2 MB)
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="h-12 w-12 text-red-600 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Order Form Template</h3>
                  <p className="text-sm text-slate-600 mb-4">Printable order form for offline ordering</p>
                  <Button variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download (0.5 MB)
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="h-12 w-12 text-teal-600 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">API Documentation</h3>
                  <p className="text-sm text-slate-600 mb-4">Technical documentation for developers</p>
                  <Button variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download (1.2 MB)
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
