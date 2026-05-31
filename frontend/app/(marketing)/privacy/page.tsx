import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Shield, Eye, Lock, Database, Mail, Phone } from "lucide-react"

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-blue-100 text-blue-800">Privacy</Badge>
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">Privacy Policy</h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          Your privacy is important to us. This policy explains how we collect, use, and protect your information.
        </p>
        <p className="text-slate-500 mt-4">Last updated: January 1, 2024</p>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Privacy Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              PackagePro is committed to protecting your privacy and ensuring the security of your personal information.
              This Privacy Policy describes how we collect, use, disclose, and safeguard your information when you use
              our website, products, and services.
            </p>
          </CardContent>
        </Card>

        {/* Information We Collect */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              Information We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold mb-3">Personal Information</h4>
              <ul className="space-y-2 text-slate-600">
                <li>• Name, email address, and phone number</li>
                <li>• Billing and shipping addresses</li>
                <li>• Payment information (processed securely by third-party providers)</li>
                <li>• Company information for business accounts</li>
                <li>• Account credentials and preferences</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Order Information</h4>
              <ul className="space-y-2 text-slate-600">
                <li>• Product selections and customizations</li>
                <li>• Order history and transaction details</li>
                <li>• Design files and specifications</li>
                <li>• Communication preferences</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Technical Information</h4>
              <ul className="space-y-2 text-slate-600">
                <li>• IP address and browser information</li>
                <li>• Device type and operating system</li>
                <li>• Website usage patterns and analytics</li>
                <li>• Cookies and similar tracking technologies</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* How We Use Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="mr-2 h-5 w-5" />
              How We Use Your Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Service Delivery</h4>
              <p className="text-slate-600">
                We use your information to process orders, provide customer support, and deliver our packaging
                solutions.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Communication</h4>
              <p className="text-slate-600">
                We may contact you about your orders, account updates, promotional offers, and important service
                announcements.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Improvement and Analytics</h4>
              <p className="text-slate-600">
                We analyze usage patterns to improve our website, products, and services, and to better understand
                customer needs.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Legal Compliance</h4>
              <p className="text-slate-600">
                We may use your information to comply with legal obligations, resolve disputes, and enforce our
                agreements.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Information Sharing */}
        <Card>
          <CardHeader>
            <CardTitle>Information Sharing and Disclosure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Service Providers</h4>
              <p className="text-slate-600">
                We share information with trusted third-party service providers who help us operate our business,
                including payment processors, shipping companies, and technology providers.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Business Transfers</h4>
              <p className="text-slate-600">
                In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of
                the business transaction.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Legal Requirements</h4>
              <p className="text-slate-600">
                We may disclose your information when required by law, court order, or to protect our rights, property,
                or safety.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Consent</h4>
              <p className="text-slate-600">
                We may share your information with your explicit consent for specific purposes not covered by this
                policy.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="mr-2 h-5 w-5" />
              Data Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Security Measures</h4>
              <p className="text-slate-600">
                We implement industry-standard security measures to protect your information, including encryption,
                secure servers, and regular security audits.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Payment Security</h4>
              <p className="text-slate-600">
                Payment information is processed by PCI-compliant third-party providers. We do not store complete credit
                card information on our servers.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Access Controls</h4>
              <p className="text-slate-600">
                Access to personal information is restricted to authorized personnel who need it to perform their job
                functions.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Data Breach Response</h4>
              <p className="text-slate-600">
                In the unlikely event of a data breach, we will notify affected users and relevant authorities as
                required by law.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card>
          <CardHeader>
            <CardTitle>Your Privacy Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Access and Correction</h4>
              <p className="text-slate-600">
                You have the right to access, update, or correct your personal information. You can do this through your
                account settings or by contacting us.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Data Portability</h4>
              <p className="text-slate-600">
                You can request a copy of your personal information in a structured, machine-readable format.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Deletion</h4>
              <p className="text-slate-600">
                You can request deletion of your personal information, subject to legal and business requirements for
                record retention.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Marketing Communications</h4>
              <p className="text-slate-600">
                You can opt out of marketing communications at any time by using the unsubscribe link in emails or
                updating your preferences.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cookies and Tracking */}
        <Card>
          <CardHeader>
            <CardTitle>Cookies and Tracking Technologies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Essential Cookies</h4>
              <p className="text-slate-600">
                We use essential cookies to enable basic website functionality, including user authentication and
                shopping cart features.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Analytics Cookies</h4>
              <p className="text-slate-600">
                We use analytics cookies to understand how visitors interact with our website and to improve user
                experience.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Marketing Cookies</h4>
              <p className="text-slate-600">
                With your consent, we may use marketing cookies to deliver personalized advertisements and track
                campaign effectiveness.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Cookie Management</h4>
              <p className="text-slate-600">
                You can control cookie settings through your browser preferences. Note that disabling certain cookies
                may affect website functionality.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* International Transfers */}
        <Card>
          <CardHeader>
            <CardTitle>International Data Transfers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              Your information may be transferred to and processed in countries other than your country of residence. We
              ensure appropriate safeguards are in place to protect your information in accordance with this privacy
              policy.
            </p>
          </CardContent>
        </Card>

        {/* Children's Privacy */}
        <Card>
          <CardHeader>
            <CardTitle>Children&apos;s Privacy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              Our services are not intended for children under 13 years of age. We do not knowingly collect personal
              information from children under 13. If we become aware that we have collected such information, we will
              take steps to delete it promptly.
            </p>
          </CardContent>
        </Card>

        {/* Policy Updates */}
        <Card>
          <CardHeader>
            <CardTitle>Policy Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting
              the new policy on our website and, where appropriate, by email. Your continued use of our services after
              such changes constitutes acceptance of the updated policy.
            </p>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              If you have any questions about this Privacy Policy or our privacy practices, please contact us:
            </p>
            <div className="space-y-3">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-slate-400 mr-3" />
                <span className="text-slate-600">privacy@packagepro.com</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-slate-400 mr-3" />
                <span className="text-slate-600">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-start">
                <div className="h-5 w-5 text-slate-400 mr-3 mt-0.5">📍</div>
                <div className="text-slate-600">
                  <p>PackagePro Privacy Officer</p>
                  <p>123 Business Street</p>
                  <p>City, State 12345</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Footer */}
        <div className="text-center text-slate-600">
          <p>
            This Privacy Policy is effective as of January 1, 2024, and will remain in effect except with respect to any
            changes in its provisions in the future.
          </p>
        </div>
      </div>
    </div>
  )
}
