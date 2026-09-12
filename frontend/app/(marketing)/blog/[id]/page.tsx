
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, ArrowLeft, Share2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface BlogPost {
  id: number
  title: string
  content: string[]
  excerpt: string
  category: string
  date: string
  readTime: string
  image: string
  featured: boolean
}

const blogPosts: Record<number, BlogPost> = {
  1: {
    id: 1,
    title: "How to Choose the Right Packaging for Your Restaurant",
    excerpt:
      "Discover the key factors to consider when selecting packaging that keeps food fresh, represents your brand, and satisfies customers.",
    content: [
      "When running a restaurant, packaging isn&apos;t just a container—it&apos;s your brand ambassador. Every takeout order is an opportunity to impress customers and encourage repeat business. But with so many options available, how do you choose the right packaging?",
      "First, consider the type of food you&apos;re serving. Hot foods need insulation, while cold foods require temperature control. Greasy foods need leak-proof packaging, while delicate items need cushioning protection.",
      "Next, think about your brand image. Your packaging should reflect your restaurant&apos;s personality—whether you&apos;re upscale and elegant or casual and fun-loving. Colors, materials, and design all play a role in communicating your brand values to customers.",
      "Sustainability is increasingly important to modern consumers. Many diners prefer eco-friendly packaging options that align with their environmental values. Offering compostable or recyclable packaging can actually attract environmentally conscious customers.",
      "Finally, consider the practical aspects: cost, storage space, and ease of assembly. While premium packaging can be costly, it may be worth the investment if it enhances your brand image and customer experience.",
      "Remember, great packaging protects your food while making your brand memorable. Take the time to research options and test different solutions until you find what works best for your restaurant.",
    ],
    category: "Business Tips",
    date: "2024-01-15",
    readTime: "5 min read",
    image: "/placeholder.svg?height=400&width=800",
    featured: true,
  },
  2: {
    id: 2,
    title: "Sustainable Packaging: Good for Business and Environment",
    excerpt:
      "Learn how eco-friendly packaging can reduce costs, attract environmentally conscious customers, and boost your brand image.",
    content: [
      "In today&apos;s environmentally conscious market, sustainable packaging isn&apos;t just a buzzword—it&apos;s a business strategy that can drive customer loyalty and cost savings.",
      "Customers are increasingly choosing businesses that share their environmental values. By switching to sustainable packaging, you&apos;re not only doing good for the planet, but you&apos;re also attracting a growing segment of eco-conscious consumers.",
      "Many sustainable packaging options are actually more cost-effective in the long run. While initial costs might be slightly higher, bulk purchasing and reduced waste can lead to significant savings over time.",
      "Materials like compostable containers, recycled cardboard, and plant-based plastics are becoming more mainstream and affordable. These options often perform just as well as traditional plastics while offering environmental benefits.",
      "Beyond customer appeal, sustainable packaging can improve your brand&apos;s reputation and even qualify you for certain certifications or tax incentives. Many local governments offer programs that support businesses adopting eco-friendly practices.",
      "Remember, sustainability is a journey, not a destination. Start with small changes—like switching to compostable utensils or recycled bags—and gradually expand your sustainable packaging initiatives.",
    ],
    category: "Sustainability",
    date: "2024-01-12",
    readTime: "7 min read",
    image: "/placeholder.svg?height=400&width=800",
    featured: false,
  },
  3: {
    id: 3,
    title: "Wedding Packaging Ideas That Wow Your Guests",
    excerpt:
      "Creative packaging solutions for wedding favors, gifts, and treats that will make your special day even more memorable.",
    content: [
      "Your wedding is one of the most important days of your life, and every detail matters—including how you present favors and gifts to your guests.",
      "Personalized packaging adds a special touch that shows thoughtfulness and care. Consider custom-printed boxes with your names, wedding date, or a romantic quote that fits your theme.",
      "For edible favors, presentation is everything. Elegant tins, decorative bags, or custom-labeled jars can transform simple treats into memorable keepsakes that guests will appreciate.",
      "Don't forget to match your packaging to your wedding theme. A rustic farm wedding might use burlap and twine, while a formal ballroom affair could feature elegant satin ribbons and embossed boxes.",
      "Practical yet beautiful options include customized tote bags that guests can actually use after the event, or elegant keepsake boxes that become treasured mementos of your special day.",
      "The key is to find packaging that reflects your personality as a couple while providing a functional container that guests will value long after the celebration ends.",
    ],
    category: "Events",
    date: "2024-01-10",
    readTime: "4 min read",
    image: "/placeholder.svg?height=400&width=800",
    featured: false,
  },
  4: {
    id: 4,
    title: "The Psychology of Packaging Colors in Branding",
    excerpt:
      "Understand how different colors affect customer perception and learn to choose the right colors for your packaging design.",
    content: [
      "Color psychology plays a crucial role in packaging design, influencing purchasing decisions and brand perception in powerful ways.",
      "Blue conveys trust and reliability—perfect for professional services and healthcare products. It&apos;s often associated with calm and stability, making it ideal for products that prioritize security and dependability.",
      "Red creates urgency and excitement, which is why it&apos;s commonly used for food and beverage packaging. It stimulates appetite and can encourage impulse purchases. However, use it sparingly to avoid overwhelming customers.",
      "Green represents nature, growth, and health. It&apos;s the go-to choice for organic products, eco-friendly items, and anything related to wellness or sustainability.",
      "Black and white packaging suggests luxury and sophistication. Brands using this palette often position themselves as premium or minimalist, emphasizing quality over flashy marketing.",
      "Yellow is attention-grabbing and optimistic, great for products that want to convey energy and happiness. It&apos;s effective for grabbing attention on crowded shelves and creating a cheerful brand image.",
      "When choosing packaging colors, consider your target audience, product type, and brand personality. The right color choice can enhance your brand&apos;s message and drive sales.",
    ],
    category: "Design",
    date: "2024-01-08",
    readTime: "6 min read",
    image: "/placeholder.svg?height=400&width=800",
    featured: false,
  },
  5: {
    id: 5,
    title: "Cost-Effective Packaging Solutions for Small Businesses",
    excerpt:
      "Smart strategies to get professional packaging on a budget without compromising on quality or brand image.",
    content: [
      "Starting a small business means making every dollar count, but you don&apos;t have to sacrifice professional packaging for budget constraints.",
      "Bulk purchasing is your best friend. Ordering larger quantities often provides significant per-unit savings. Partner with other local businesses to pool orders and qualify for volume discounts.",
      "Standard sizes are your wallet&apos;s ally. Custom dimensions can be beautiful, but they come with premium price tags. Opting for standard box and bag sizes reduces costs while maintaining professional appearance.",
      "DIY labeling can save money while adding a personal touch. Printable sticker labels or simple stamp designs can elevate basic packaging without breaking the bank.",
      "Consider stock designs over fully custom solutions. Many suppliers offer pre-printed options with generic yet attractive designs that look professional without the custom design fees.",
      "Start simple and upgrade gradually. Begin with essential, cost-effective packaging, then invest in premium options for special products or occasions as your business grows.",
      "Remember, excellent packaging doesn&apos;t have to be expensive—it just needs to be thoughtful, consistent, and aligned with your brand values.",
    ],
    category: "Business Tips",
    date: "2024-01-05",
    readTime: "5 min read",
    image: "/placeholder.svg?height=400&width=800",
    featured: false,
  },
  6: {
    id: 6,
    title: "Custom vs. Standard Packaging: Making the Right Choice",
    excerpt:
      "Compare the benefits and costs of custom packaging versus standard options to make the best decision for your business.",
    content: [
      "Choosing between custom and standard packaging is one of the biggest decisions a business can make, and the right choice depends on numerous factors.",
      "Standard packaging offers affordability and convenience. It&apos;s readily available, requires no design costs, and is perfect for businesses starting out or those with budget constraints. The trade-off is less brand differentiation and limited personalization.",
      "Custom packaging provides brand uniqueness and professional appearance. It allows complete creative control, perfect brand alignment, and can create memorable unboxing experiences. However, it requires significant investment in design and minimum order quantities.",
      "For emerging businesses, starting with standard packaging often makes sense. It allows you to test products, build customer base, and understand market demand before investing heavily in custom solutions.",
      "Established brands with strong customer loyalty benefit from custom packaging&apos;s ability to reinforce brand identity and create premium experiences. The investment typically pays off in increased brand recognition and customer loyalty.",
      "A hybrid approach might be optimal: use standard packaging for everyday products and reserve custom packaging for special editions, seasonal items, or premium product lines.",
      "Ultimately, the best choice balances your budget, business stage, brand goals, and customer expectations. There&apos;s no one-size-fits-all answer—success comes from matching your packaging strategy to your business needs.",
    ],
    category: "Business Tips",
    date: "2024-01-03",
    readTime: "8 min read",
    image: "/placeholder.svg?height=400&width=800",
    featured: false,
  },
}

export default async function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postId = parseInt(id)
  const post = blogPosts[postId]

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="text-center py-12">
          <CardContent>
            <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
            <p className="text-slate-600 mb-6">The blog post you&apos;re looking for doesn&apos;t exist.</p>
            <Button asChild>
              <Link href="/blog">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Blog
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/blog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog
          </Link>
        </Button>
      </div>

      {/* Article */}
      <article className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Badge variant="secondary">{post.category}</Badge>
            <div className="flex items-center text-sm text-slate-600">
              <Calendar className="h-4 w-4 mr-1" />
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
            <div className="flex items-center text-sm text-slate-600">
              <Clock className="h-4 w-4 mr-1" />
              {post.readTime}
            </div>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">{post.title}</h1>
          <p className="text-xl text-slate-600">{post.excerpt}</p>
        </div>

        {/* Featured Image */}
        <div className="relative h-64 md:h-96 mb-8 rounded-lg overflow-hidden">
          <Image src={post.image || "/placeholder.svg"} alt={post.title} fill className="object-cover" />
        </div>

        {/* Content */}
        <div className="prose prose-slate max-w-none">
          {post.content.map((paragraph, index) => (
            <p key={index} className="mb-6 text-slate-700 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Share Section */}
        <Card className="mt-12">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600">
                <Share2 className="h-5 w-5" />
                <span className="font-medium">Share this article</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Twitter
                </Button>
                <Button variant="outline" size="sm">
                  Facebook
                </Button>
                <Button variant="outline" size="sm">
                  LinkedIn
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Related Posts */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Related Articles</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {Object.values(blogPosts)
              .filter((p) => p.id !== postId && p.category === post.category)
              .slice(0, 2)
              .map((relatedPost) => (
                <Card key={relatedPost.id} className="group hover:shadow-lg transition-shadow">
                  <div className="relative h-48 overflow-hidden rounded-t-lg">
                    <Image
                      src={relatedPost.image || "/placeholder.svg"}
                      alt={relatedPost.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {relatedPost.category}
                      </Badge>
                      <div className="flex items-center text-xs text-slate-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(relatedPost.date).toLocaleDateString()}
                      </div>
                    </div>
                    <CardTitle className="line-clamp-2">{relatedPost.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{relatedPost.excerpt}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/ blog / ${relatedPost.id} `}>
                        Read More
                        <ArrowLeft className="ml-1 h-3 w-3 rotate-180" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      </article>
    </div>
  )
}

