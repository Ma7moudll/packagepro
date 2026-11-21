import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HelpCircle, MessageSquare } from "lucide-react"
import Link from "next/link"

export default function FAQPage() {
  const faqCategories = [
    {
      title: "Orders & Shipping",
      questions: [
        {
          question: "What is the minimum order quantity?",
          answer:
            "Minimum order quantities vary by product. For B2B orders, it&apos;s typically 100-1000 pieces depending on the item. For event packaging, we can accommodate smaller orders starting from 25 pieces. Custom products may have different minimums based on production requirements.",
        },
        {
          question: "How long does shipping take?",
          answer:
            "Standard shipping takes 5-7 business days within the continental US. Express shipping (2-3 days) and overnight shipping are available for rush orders. International shipping times vary by destination, typically 10-14 business days.",
        },
        {
          question: "Do you offer international shipping?",
          answer:
            "Yes, we ship internationally to most countries. Shipping costs and delivery times vary by destination. Some restrictions may apply for certain products. Contact us for a shipping quote to your location.",
        },
        {
          question: "Can I track my order?",
          answer:
            "Yes, once your order ships, you&apos;ll receive a tracking number via email. You can track your package through our website or directly with the shipping carrier.",
        },
      ],
    },
    {
      title: "Customization & Design",
      questions: [
        {
          question: "What file formats do you accept for custom designs?",
          answer:
            "We accept AI, EPS, PDF, PNG, and JPG files. For best results, provide vector files (AI or EPS) with at least 300 DPI resolution. Include a 3mm bleed area for print designs.",
        },
        {
          question: "How long does customization take?",
          answer:
            "Standard customization takes 5-7 business days after design approval. This includes design review, proof creation, and production setup. Rush orders can be completed in 2-3 business days for an additional fee.",
        },
        {
          question: "Can I see a proof before production?",
          answer:
            "Yes, we provide digital proofs for all custom orders. You&apos;ll receive a proof within 24-48 hours of submitting your design. Production begins only after you approve the proof.",
        },
        {
          question: "What if I don&apos;t have a design?",
          answer:
            "Our design team can help create custom artwork for your packaging. We offer design services starting at 4,000 EGP for simple logos and text layouts. Contact us to discuss your design needs.",
        },
      ],
    },
    {
      title: "Pricing & Payment",
      questions: [
        {
          question: "How is pricing calculated?",
          answer:
            "Pricing is based on product type, quantity, customization complexity, and any special features. Larger quantities receive volume discounts. Custom designs and special finishes may incur additional costs.",
        },
        {
          question: "What payment methods do you accept?",
          answer:
            "We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers. Business customers may qualify for Net 30 payment terms with credit approval.",
        },
        {
          question: "Do you offer volume discounts?",
          answer:
            "Yes, we offer tiered pricing with discounts for larger quantities. Discounts typically start at 500+ pieces and increase with volume. Contact us for a custom quote on large orders.",
        },
        {
          question: "Are there any setup fees?",
          answer:
            "Custom orders may include a one-time setup fee ranging from 1,350-5,400 EGP depending on complexity. This covers design setup, plate creation, and production preparation. The fee is waived for repeat orders of the same design.",
        },
      ],
    },
    {
      title: "Materials & Quality",
      questions: [
        {
          question: "What materials do you use?",
          answer:
            "We use high-quality materials including corrugated cardboard, duplex board, kraft paper, and eco-friendly options. All materials are sourced from certified suppliers and meet industry standards for food safety when applicable.",
        },
        {
          question: "Are your products eco-friendly?",
          answer:
            "Yes, we offer many eco-friendly options including recycled materials, biodegradable coatings, and sustainable inks. We're committed to environmental responsibility and can help you choose the most sustainable options for your needs.",
        },
        {
          question: "Do you have quality certifications?",
          answer:
            "Yes, we are ISO 9001:2015 certified for quality management. Our facility follows strict quality control procedures, and all products undergo inspection before shipping.",
        },
        {
          question: "Can I request samples?",
          answer:
            "Yes, we provide samples for most products. Sample packs are available for 800-1,350 EGP including shipping. For custom designs, we can provide samples after initial design approval.",
        },
      ],
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-blue-100 text-blue-800">Help Center</Badge>
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          Find answers to common questions about our packaging solutions, ordering process, and services.
        </p>
      </div>

      {/* FAQ Categories */}
      <div className="space-y-8">
        {faqCategories.map((category, categoryIndex) => (
          <Card key={categoryIndex}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <HelpCircle className="mr-2 h-5 w-5 text-emerald-600" />
                {category.title}
              </CardTitle>
              <CardDescription>Common questions about {category.title.toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {category.questions.map((faq, questionIndex) => (
                  <AccordionItem key={questionIndex} value={`item-${categoryIndex}-${questionIndex}`}>
                    <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-slate-600">{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contact Section */}
      <div className="mt-16">
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-8 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-emerald-600 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Still Have Questions?</h2>
            <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
              Can&apos;t find the answer you&apos;re looking for? Our customer support team is here to help you with any questions
              about our packaging solutions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/contact">Contact Support</Link>
              </Button>
              <Button variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-100">
                WhatsApp Us
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
