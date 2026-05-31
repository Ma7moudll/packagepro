import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Award, Users, Leaf, Target, Heart, Zap } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <Badge className="mb-4 bg-emerald-100 text-emerald-800">About PackagePro</Badge>
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6">
          Crafting Quality Packaging Solutions Since 2015
        </h1>
        <p className="text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed">
          From a small workshop with a vision to become a leading packaging solutions provider, we&apos;ve built our
          reputation on quality, innovation, and exceptional customer service. Today, we serve hundreds of businesses
          and thousands of individuals with custom packaging that protects products and enhances brands.
        </p>
      </div>

      {/* Story Section */}
      <div className="grid lg:grid-cols-2 gap-12 mb-16">
        <div className="space-y-6">
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">Our Story</h2>
          <div className="space-y-4 text-slate-600">
            <p>
              PackagePro began in 2015 when our founder, Sarah Johnson, recognized a gap in the market for high-quality,
              customizable packaging solutions that were accessible to both large businesses and individual customers
              planning special events.
            </p>
            <p>
              Starting with a small workshop and a commitment to excellence, we focused on understanding our customers&apos;
              unique needs and delivering packaging solutions that exceeded their expectations. Our dedication to
              quality materials, innovative designs, and sustainable practices quickly earned us a loyal customer base.
            </p>
            <p>
              Today, we operate from a state-of-the-art facility and serve customers across the country, but we&apos;ve never
              forgotten our roots. Every package we create still receives the same attention to detail and personal care
              that defined our early days.
            </p>
          </div>
        </div>

        <div className="relative">
          <Image
            src="/placeholder.svg?height=400&width=600"
            alt="Our workshop and team"
            width={600}
            height={400}
            className="rounded-2xl shadow-lg"
          />
          <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-lg">
            <div className="flex items-center gap-2">
              <Award className="h-6 w-6 text-emerald-600" />
              <div>
                <p className="font-semibold">ISO 9001 Certified</p>
                <p className="text-sm text-slate-600">Quality Management</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="mb-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-4">Our Values</h2>
          <p className="text-xl text-slate-600">The principles that guide everything we do</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="text-center border-0 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Award className="h-6 w-6 text-emerald-600" />
              </div>
              <CardTitle>Quality First</CardTitle>
              <CardDescription>
                We never compromise on quality. Every product meets our rigorous standards before it reaches our
                customers.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center border-0 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Customer-Centric</CardTitle>
              <CardDescription>
                Our customers&apos; success is our success. We listen, understand, and deliver solutions that exceed
                expectations.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center border-0 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Leaf className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Sustainability</CardTitle>
              <CardDescription>
                We&apos;re committed to reducing environmental impact through sustainable materials and responsible manufacturing
                practices.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center border-0 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Innovation</CardTitle>
              <CardDescription>
                We&apos;re constantly exploring new materials and technologies to improve our products and services.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center border-0 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Heart className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle>Integrity</CardTitle>
              <CardDescription>
                Honest communication, fair pricing, and ethical business practices are the foundation of our
                relationships.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center border-0 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-orange-600" />
              </div>
              <CardTitle>Agility</CardTitle>
              <CardDescription>
                We adapt quickly to changing needs and market demands while maintaining our high standards.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-slate-50 rounded-2xl p-8 mb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-4">By the Numbers</h2>
          <p className="text-slate-600">Our impact in the packaging industry</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl lg:text-4xl font-bold text-emerald-600 mb-2">500+</div>
            <p className="text-slate-600">Happy Businesses</p>
          </div>
          <div className="text-center">
            <div className="text-3xl lg:text-4xl font-bold text-blue-600 mb-2">10M+</div>
            <p className="text-slate-600">Products Delivered</p>
          </div>
          <div className="text-center">
            <div className="text-3xl lg:text-4xl font-bold text-purple-600 mb-2">50+</div>
            <p className="text-slate-600">Product Categories</p>
          </div>
          <div className="text-center">
            <div className="text-3xl lg:text-4xl font-bold text-orange-600 mb-2">99%</div>
            <p className="text-slate-600">Customer Satisfaction</p>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="mb-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-4">Meet Our Team</h2>
          <p className="text-xl text-slate-600">The passionate people behind PackagePro</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="text-center">
            <CardContent className="p-6">
              <Image
                src="/placeholder.svg?height=200&width=200"
                alt="Sarah Johnson"
                width={200}
                height={200}
                className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
              />
              <h3 className="font-semibold text-lg mb-1">Sarah Johnson</h3>
              <p className="text-emerald-600 mb-2">Founder & CEO</p>
              <p className="text-slate-600 text-sm">
                We&apos;re dedicated to providing high-quality, sustainable packaging solutions for businesses of all sizes. 15+ years in the industry.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <Image
                src="/placeholder.svg?height=200&width=200"
                alt="Michael Chen"
                width={200}
                height={200}
                className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
              />
              <h3 className="font-semibold text-lg mb-1">Michael Chen</h3>
              <p className="text-emerald-600 mb-2">Head of Design</p>
              <p className="text-slate-600 text-sm">
                Creative director with expertise in custom packaging design and brand integration.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <Image
                src="/placeholder.svg?height=200&width=200"
                alt="Emily Rodriguez"
                width={200}
                height={200}
                className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
              />
              <h3 className="font-semibold text-lg mb-1">Emily Rodriguez</h3>
              <p className="text-emerald-600 mb-2">Operations Manager</p>
              <p className="text-slate-600 text-sm">
                Ensures smooth operations and timely delivery of all orders with attention to detail.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-emerald-600 text-white rounded-2xl p-8">
        <h2 className="text-2xl lg:text-3xl font-bold mb-4">Ready to Work Together?</h2>
        <p className="text-xl mb-6 text-white/95">Let&apos;s create packaging solutions that make your brand stand out</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" variant="secondary">
            <Link href="/contact">Get Started Today</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white text-white hover:bg-white hover:text-emerald-600"
          >
            <Link href="/products">View Our Products</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
