import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { FileText, Calendar, Shield } from "lucide-react"

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-slate-100 text-slate-800">Legal</Badge>
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">Terms of Service</h1>
        <div className="flex items-center justify-center gap-4 text-slate-600">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Last updated: January 1, 2024
          </div>
          <div className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Version 2.1
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Introduction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Agreement Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none">
            <p>
              Welcome to PackagePro. These Terms of Service (&quot;Terms&quot;) govern your use of our website, products, and
              services. By accessing or using our services, you agree to be bound by these Terms. If you disagree with
              any part of these terms, then you may not access our services.
            </p>
          </CardContent>
        </Card>

        {/* Definitions */}
        <Card>
          <CardHeader>
            <CardTitle>1. Definitions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">&quot;Company&quot; (referred to as &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;)</h4>
              <p className="text-slate-600">Refers to PackagePro, the provider of packaging solutions and services.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">&quot;Customer&quot; or &quot;User&quot; (referred to as &quot;you&quot;)</h4>
              <p className="text-slate-600">Refers to the individual or entity using our services.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">&quot;Services&quot;</h4>
              <p className="text-slate-600">Refers to all products, services, and features provided by PackagePro.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">&quot;Products&quot;</h4>
              <p className="text-slate-600">
                Refers to all packaging materials, custom designs, and related items offered by PackagePro.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account Terms */}
        <Card>
          <CardHeader>
            <CardTitle>2. Account Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">2.1 Account Creation</h4>
              <p className="text-slate-600">
                You must provide accurate and complete information when creating an account. You are responsible for
                maintaining the security of your account and password.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">2.2 Account Responsibility</h4>
              <p className="text-slate-600">
                You are responsible for all activities that occur under your account. You must notify us immediately of
                any unauthorized use of your account.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">2.3 Age Requirements</h4>
              <p className="text-slate-600">
                You must be at least 18 years old to use our services. By using our services, you represent that you
                meet this age requirement.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Orders and Payment */}
        <Card>
          <CardHeader>
            <CardTitle>3. Orders and Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">3.1 Order Acceptance</h4>
              <p className="text-slate-600">
                All orders are subject to acceptance by PackagePro. We reserve the right to refuse or cancel any order
                for any reason, including but not limited to product availability, errors in pricing, or suspected
                fraud.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">3.2 Pricing</h4>
              <p className="text-slate-600">
                All prices are subject to change without notice. The price charged will be the price in effect at the
                time the order is placed, subject to acceptance.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">3.3 Payment Terms</h4>
              <p className="text-slate-600">
                Payment is due upon order placement unless otherwise agreed. We accept major credit cards, PayPal, and
                bank transfers. Business customers may qualify for Net 30 terms with credit approval.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">3.4 Minimum Orders</h4>
              <p className="text-slate-600">
                Certain products have minimum order quantities. These requirements are clearly stated on product pages
                and must be met for order acceptance.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Custom Design Services */}
        <Card>
          <CardHeader>
            <CardTitle>4. Custom Design Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">4.1 Design Ownership</h4>
              <p className="text-slate-600">
                You retain ownership of your original designs and logos. By submitting designs, you grant us a license
                to use them solely for producing your ordered products.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">4.2 Design Requirements</h4>
              <p className="text-slate-600">
                You are responsible for ensuring your designs meet our technical specifications and do not infringe on
                any third-party rights.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">4.3 Approval Process</h4>
              <p className="text-slate-600">
                All custom designs require your approval before production begins. Once approved, changes may not be
                possible and additional fees may apply.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Shipping and Delivery */}
        <Card>
          <CardHeader>
            <CardTitle>5. Shipping and Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">5.1 Delivery Times</h4>
              <p className="text-slate-600">
                Delivery times are estimates and not guarantees. We are not liable for delays caused by shipping
                carriers, weather, or other circumstances beyond our control.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">5.2 Risk of Loss</h4>
              <p className="text-slate-600">
                Risk of loss and title for products pass to you upon delivery to the shipping carrier.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">5.3 Damaged or Lost Shipments</h4>
              <p className="text-slate-600">
                You must inspect shipments upon delivery and report any damage or shortages within 48 hours.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Returns and Refunds */}
        <Card>
          <CardHeader>
            <CardTitle>6. Returns and Refunds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">6.1 Custom Products</h4>
              <p className="text-slate-600">
                Custom-made products are generally not returnable unless there is a manufacturing defect or error on our
                part.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">6.2 Standard Products</h4>
              <p className="text-slate-600">
                Standard products may be returned within 30 days of delivery in original condition. Return shipping
                costs are the customer&apos;s responsibility unless the return is due to our error.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">6.3 Refund Processing</h4>
              <p className="text-slate-600">
                Approved refunds will be processed within 5-10 business days to the original payment method.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Intellectual Property */}
        <Card>
          <CardHeader>
            <CardTitle>7. Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">7.1 Our Content</h4>
              <p className="text-slate-600">
                All content on our website, including text, graphics, logos, and software, is owned by PackagePro and
                protected by copyright and other intellectual property laws.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">7.2 Your Content</h4>
              <p className="text-slate-600">
                You represent that you own or have the right to use any content you provide to us, including designs,
                logos, and text.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">7.3 Infringement Claims</h4>
              <p className="text-slate-600">
                If you believe your intellectual property rights have been infringed, please contact us immediately with
                details of the alleged infringement.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Limitation of Liability */}
        <Card>
          <CardHeader>
            <CardTitle>8. Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">8.1 Disclaimer</h4>
              <p className="text-slate-600">
                Our services are provided &quot;as is&quot; without warranties of any kind. We disclaim all warranties, express or
                implied, including but not limited to merchantability and fitness for a particular purpose.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">8.2 Limitation</h4>
              <p className="text-slate-600">
                In no event shall PackagePro be liable for any indirect, incidental, special, consequential, or punitive
                damages, including but not limited to loss of profits, data, or business interruption.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">8.3 Maximum Liability</h4>
              <p className="text-slate-600">
                Our total liability for any claim shall not exceed the amount paid by you for the specific product or
                service giving rise to the claim.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Termination */}
        <Card>
          <CardHeader>
            <CardTitle>9. Termination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">9.1 Termination by You</h4>
              <p className="text-slate-600">
                You may terminate your account at any time by contacting us. Termination does not affect pending orders
                or obligations.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">9.2 Termination by Us</h4>
              <p className="text-slate-600">
                We may terminate or suspend your account immediately for violation of these Terms or for any other
                reason at our sole discretion.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">9.3 Effect of Termination</h4>
              <p className="text-slate-600">
                Upon termination, your right to use our services ceases immediately. Provisions that by their nature
                should survive termination shall survive.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Governing Law */}
        <Card>
          <CardHeader>
            <CardTitle>10. Governing Law and Disputes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">10.1 Governing Law</h4>
              <p className="text-slate-600">
                These Terms shall be governed by and construed in accordance with the laws of the State of [Your State],
                without regard to its conflict of law provisions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">10.2 Dispute Resolution</h4>
              <p className="text-slate-600">
                Any disputes arising from these Terms or your use of our services shall be resolved through binding
                arbitration in accordance with the rules of the American Arbitration Association.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">10.3 Class Action Waiver</h4>
              <p className="text-slate-600">
                You agree that any arbitration or legal proceeding shall be limited to the dispute between you and
                PackagePro individually. You waive any right to participate in class action lawsuits.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Changes to Terms */}
        <Card>
          <CardHeader>
            <CardTitle>11. Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">11.1 Modifications</h4>
              <p className="text-slate-600">
                We reserve the right to modify these Terms at any time. Changes will be effective immediately upon
                posting on our website.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">11.2 Notification</h4>
              <p className="text-slate-600">
                We will notify you of significant changes via email or prominent notice on our website. Continued use of
                our services constitutes acceptance of the modified Terms.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>12. Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="space-y-2 text-slate-600">
              <p>
                <strong>Email:</strong> legal@packagepro.com
              </p>
              <p>
                <strong>Phone:</strong> +1 (555) 123-4567
              </p>
              <p>
                <strong>Address:</strong> 123 Business Street, City, State 12345
              </p>
              <p>
                <strong>Business Hours:</strong> Monday-Friday, 8:00 AM - 6:00 PM EST
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Footer */}
        <div className="text-center text-slate-600">
          <p>
            By using PackagePro&apos;s services, you acknowledge that you have read, understood, and agree to be bound by
            these Terms of Service.
          </p>
          <p className="mt-4 text-sm">Last updated: January 1, 2024 | Version 2.1</p>
        </div>
      </div>
    </div>
  )
}
