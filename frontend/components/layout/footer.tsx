import Link from "next/link"
import { Package, Mail, Phone, MapPin, Facebook, Instagram, Twitter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Package className="h-8 w-8 text-emerald-400" />
              <span className="text-2xl font-bold">PackagePro</span>
            </div>
            <p className="text-slate-300">
              Premium packaging solutions for businesses and events. Quality materials, custom designs, and exceptional
              service.
            </p>
            <div className="flex space-x-4">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                <Facebook className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                <Instagram className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                <Twitter className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Quick Links</h3>
            <nav className="flex flex-col space-y-2">
              <Link href="/products" className="text-slate-300 hover:text-white transition-colors">
                Products
              </Link>
              <Link href="/industries" className="text-slate-300 hover:text-white transition-colors">
                Industries
              </Link>
              <Link href="/wholesale" className="text-slate-300 hover:text-white transition-colors">
                Wholesale
              </Link>

              <Link href="/templates" className="text-slate-300 hover:text-white transition-colors">
                Templates
              </Link>
              <Link href="/brief" className="text-slate-300 hover:text-white transition-colors">
                Send Brief
              </Link>
              <Link href="/samples" className="text-slate-300 hover:text-white transition-colors">
                Samples
              </Link>
              <Link href="/inspirations" className="text-slate-300 hover:text-white transition-colors">
                Inspirations
              </Link>
            </nav>
          </div>

          {/* Solutions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Solutions</h3>
            <nav className="flex flex-col space-y-2">
              <Link href="/b2b" className="text-slate-300 hover:text-white transition-colors">
                B2B Portal
              </Link>
              <Link href="/white-label" className="text-slate-300 hover:text-white transition-colors">
                White Label
              </Link>
              <Link href="/warehousing" className="text-slate-300 hover:text-white transition-colors">
                Warehousing
              </Link>
              <Link href="/payments/flexible" className="text-slate-300 hover:text-white transition-colors">
                Flexible Payments
              </Link>
              <Link href="/sustainable" className="text-slate-300 hover:text-white transition-colors">
                Sustainability
              </Link>
              <Link href="/api-docs" className="text-slate-300 hover:text-white transition-colors">
                API Documentation
              </Link>
              <Link href="/integrations" className="text-slate-300 hover:text-white transition-colors">
                Integrations
              </Link>
            </nav>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Info</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-emerald-400" />
                <span className="text-slate-300">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-emerald-400" />
                <span className="text-slate-300">info@packagepro.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-emerald-400" />
                <span className="text-slate-300">123 Business St, City, State 12345</span>
              </div>
            </div>

            {/* Newsletter */}
            <div className="space-y-2">
              <h4 className="font-medium">Newsletter</h4>
              <div className="flex space-x-2">
                <Input
                  placeholder="Your email"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                />
                <Button className="bg-emerald-600 hover:bg-emerald-700">Subscribe</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-slate-400 text-sm">© 2024 PackagePro. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/privacy" className="text-slate-400 hover:text-white text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-slate-400 hover:text-white text-sm transition-colors">
              Terms of Service
            </Link>
            <Link href="/shipping" className="text-slate-400 hover:text-white text-sm transition-colors">
              Shipping Info
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
