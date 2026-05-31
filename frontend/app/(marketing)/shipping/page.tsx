import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Truck, Package, Clock, MapPin, Calculator, Shield, Globe } from "lucide-react"

export default function ShippingPage() {
  const shippingZones = [
    {
      zone: "Zone 1 - Local",
      states: ["California", "Nevada", "Arizona"],
      standardTime: "1-2 business days",
      expressTime: "Next day",
      standardCost: "$5.99",
      expressCost: "$15.99",
    },
    {
      zone: "Zone 2 - Regional",
      states: ["Oregon", "Washington", "Utah", "Colorado", "New Mexico"],
      standardTime: "2-3 business days",
      expressTime: "1-2 business days",
      standardCost: "$8.99",
      expressCost: "$19.99",
    },
    {
      zone: "Zone 3 - National",
      states: ["All other US states"],
      standardTime: "3-5 business days",
      expressTime: "2-3 business days",
      standardCost: "$12.99",
      expressCost: "$24.99",
    },
  ]

  const internationalCountries = [
    { country: "Canada", time: "5-7 business days", cost: "$25.99" },
    { country: "Mexico", time: "7-10 business days", cost: "$29.99" },
    { country: "United Kingdom", time: "7-14 business days", cost: "$35.99" },
    { country: "European Union", time: "10-14 business days", cost: "$39.99" },
    { country: "Australia", time: "10-21 business days", cost: "$45.99" },
    { country: "Other Countries", time: "14-21 business days", cost: "Quote on request" },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-blue-100 text-blue-800">Shipping Information</Badge>
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">Shipping & Delivery</h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          Fast, reliable shipping options to get your packaging solutions delivered when you need them.
        </p>
      </div>

      <div className="space-y-8">
        {/* Shipping Options Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Truck className="mr-2 h-5 w-5" />
              Shipping Options
            </CardTitle>
            <CardDescription>Choose the delivery speed that works best for your needs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 border rounded-lg">
                <Package className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Standard Shipping</h3>
                <p className="text-slate-600 mb-4">Most economical option for regular deliveries</p>
                <div className="space-y-2">
                  <p className="font-medium">3-5 business days</p>
                  <p className="text-emerald-600 font-semibold">Starting at $5.99</p>
                </div>
              </div>

              <div className="text-center p-6 border rounded-lg border-emerald-200 bg-emerald-50">
                <Clock className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Express Shipping</h3>
                <p className="text-slate-600 mb-4">Faster delivery for urgent orders</p>
                <div className="space-y-2">
                  <p className="font-medium">1-2 business days</p>
                  <p className="text-emerald-600 font-semibold">Starting at $15.99</p>
                </div>
                <Badge className="mt-2 bg-emerald-600">Most Popular</Badge>
              </div>

              <div className="text-center p-6 border rounded-lg">
                <Shield className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Overnight Shipping</h3>
                <p className="text-slate-600 mb-4">Next business day delivery</p>
                <div className="space-y-2">
                  <p className="font-medium">Next business day</p>
                  <p className="text-emerald-600 font-semibold">Starting at $35.99</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Domestic Shipping Zones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              Domestic Shipping Zones (United States)
            </CardTitle>
            <CardDescription>Shipping times and costs vary by destination</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {shippingZones.map((zone, index) => (
                <div key={index} className="border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">{zone.zone}</h3>
                    <Badge variant="outline">{zone.states.join(", ")}</Badge>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Standard Shipping</h4>
                      <p className="text-slate-600">Delivery: {zone.standardTime}</p>
                      <p className="text-emerald-600 font-semibold">{zone.standardCost}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Express Shipping</h4>
                      <p className="text-slate-600">Delivery: {zone.expressTime}</p>
                      <p className="text-emerald-600 font-semibold">{zone.expressCost}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* International Shipping */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="mr-2 h-5 w-5" />
              International Shipping
            </CardTitle>
            <CardDescription>We ship worldwide with reliable international carriers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {internationalCountries.map((country, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">{country.country}</h4>
                  <p className="text-slate-600 text-sm mb-1">Delivery: {country.time}</p>
                  <p className="text-emerald-600 font-semibold">{country.cost}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold mb-2">International Shipping Notes:</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Customs duties and taxes are the responsibility of the recipient</li>
                <li>• Delivery times may vary due to customs processing</li>
                <li>• Some products may have shipping restrictions to certain countries</li>
                <li>• Tracking information provided for all international shipments</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Free Shipping */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="mr-2 h-5 w-5" />
              Free Shipping Eligibility
            </CardTitle>
            <CardDescription>Qualify for free shipping with minimum order amounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold">Individual Customers</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span>Orders $100+</span>
                    <Badge className="bg-green-100 text-green-800">Free Standard Shipping</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span>Orders $250+</span>
                    <Badge className="bg-green-100 text-green-800">Free Express Shipping</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Business Customers</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span>Orders $500+</span>
                    <Badge className="bg-blue-100 text-blue-800">Free Standard Shipping</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span>Orders $1,000+</span>
                    <Badge className="bg-blue-100 text-blue-800">Free Express Shipping</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Processing Time */}
        <Card>
          <CardHeader>
            <CardTitle>Order Processing Time</CardTitle>
            <CardDescription>Time required to prepare your order for shipment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Standard Products</h4>
                <ul className="space-y-2 text-slate-600">
                  <li>• In-stock items: 1-2 business days</li>
                  <li>• Made-to-order items: 3-5 business days</li>
                  <li>• Bulk orders (1000+ pieces): 5-7 business days</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Custom Products</h4>
                <ul className="space-y-2 text-slate-600">
                  <li>• Custom design approval: 1-2 business days</li>
                  <li>• Production time: 5-10 business days</li>
                  <li>• Rush orders available: +50% fee</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tracking and Delivery */}
        <Card>
          <CardHeader>
            <CardTitle>Tracking and Delivery</CardTitle>
            <CardDescription>Stay informed about your order status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold mb-3">Order Tracking</h4>
              <ul className="space-y-2 text-slate-600">
                <li>• Tracking number provided via email when order ships</li>
                <li>• Real-time tracking available on our website</li>
                <li>• SMS notifications available upon request</li>
                <li>• Delivery confirmation with signature required for orders over $500</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-3">Delivery Information</h4>
              <ul className="space-y-2 text-slate-600">
                <li>• Deliveries made Monday through Friday, 9 AM - 6 PM</li>
                <li>• Saturday delivery available for express orders</li>
                <li>• Recipient must be available to receive package</li>
                <li>• Packages may be left with building concierge or management</li>
                <li>• Redelivery attempts made for 3 business days</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Special Handling */}
        <Card>
          <CardHeader>
            <CardTitle>Special Handling Services</CardTitle>
            <CardDescription>Additional services for special requirements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">White Glove Delivery</h4>
                  <p className="text-slate-600 text-sm mb-2">Inside delivery and setup for large orders</p>
                  <p className="text-emerald-600 font-semibold">Starting at $75</p>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Scheduled Delivery</h4>
                  <p className="text-slate-600 text-sm mb-2">Delivery at a specific date and time</p>
                  <p className="text-emerald-600 font-semibold">Starting at $25</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Freight Shipping</h4>
                  <p className="text-slate-600 text-sm mb-2">For large or heavy orders requiring freight service</p>
                  <p className="text-emerald-600 font-semibold">Quote on request</p>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Hold for Pickup</h4>
                  <p className="text-slate-600 text-sm mb-2">Hold package at shipping facility for pickup</p>
                  <p className="text-emerald-600 font-semibold">Free</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact for Shipping */}
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Need Help with Shipping?</h2>
            <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
              Our shipping specialists are here to help you choose the best delivery option for your needs and timeline.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-emerald-600 hover:bg-emerald-700">Contact Shipping Support</Button>
              <Button variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-100">
                Calculate Shipping Cost
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
