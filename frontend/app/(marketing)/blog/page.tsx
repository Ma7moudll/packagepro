import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, ArrowRight, BookOpen } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function BlogPage() {
  const blogPosts = [
    {
      id: 1,
      title: "How to Choose the Right Packaging for Your Restaurant",
      excerpt:
        "Discover the key factors to consider when selecting packaging that keeps food fresh, represents your brand, and satisfies customers.",
      category: "Business Tips",
      date: "2024-01-15",
      readTime: "5 min read",
      image: "/placeholder.svg?height=200&width=400",
      featured: true,
    },
    {
      id: 2,
      title: "Sustainable Packaging: Good for Business and Environment",
      excerpt:
        "Learn how eco-friendly packaging can reduce costs, attract environmentally conscious customers, and boost your brand image.",
      category: "Sustainability",
      date: "2024-01-12",
      readTime: "7 min read",
      image: "/placeholder.svg?height=200&width=400",
      featured: false,
    },
    {
      id: 3,
      title: "Wedding Packaging Ideas That Wow Your Guests",
      excerpt:
        "Creative packaging solutions for wedding favors, gifts, and treats that will make your special day even more memorable.",
      category: "Events",
      date: "2024-01-10",
      readTime: "4 min read",
      image: "/placeholder.svg?height=200&width=400",
      featured: false,
    },
    {
      id: 4,
      title: "The Psychology of Packaging Colors in Branding",
      excerpt:
        "Understand how different colors affect customer perception and learn to choose the right colors for your packaging design.",
      category: "Design",
      date: "2024-01-08",
      readTime: "6 min read",
      image: "/placeholder.svg?height=200&width=400",
      featured: false,
    },
    {
      id: 5,
      title: "Cost-Effective Packaging Solutions for Small Businesses",
      excerpt:
        "Smart strategies to get professional packaging on a budget without compromising on quality or brand image.",
      category: "Business Tips",
      date: "2024-01-05",
      readTime: "5 min read",
      image: "/placeholder.svg?height=200&width=400",
      featured: false,
    },
    {
      id: 6,
      title: "Custom vs. Standard Packaging: Making the Right Choice",
      excerpt:
        "Compare the benefits and costs of custom packaging versus standard options to make the best decision for your business.",
      category: "Business Tips",
      date: "2024-01-03",
      readTime: "8 min read",
      image: "/placeholder.svg?height=200&width=400",
      featured: false,
    },
  ]

  const categories = ["All", "Business Tips", "Sustainability", "Events", "Design"]
  const featuredPost = blogPosts.find((post) => post.featured)
  const regularPosts = blogPosts.filter((post) => !post.featured)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-purple-100 text-purple-800">Knowledge Hub</Badge>
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">PackagePro Blog</h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          Insights, tips, and trends in packaging design, sustainability, and business growth.
        </p>
      </div>

      {/* Featured Post */}
      {featuredPost && (
        <Card className="mb-12 overflow-hidden">
          <div className="grid lg:grid-cols-2">
            <div className="relative h-64 lg:h-auto">
              <Image
                src={featuredPost.image || "/placeholder.svg"}
                alt={featuredPost.title}
                fill
                className="object-cover"
              />
              <Badge className="absolute top-4 left-4 bg-emerald-600">Featured</Badge>
            </div>
            <div className="p-8 flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-4">
                <Badge variant="secondary">{featuredPost.category}</Badge>
                <div className="flex items-center text-sm text-slate-600">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(featuredPost.date).toLocaleDateString()}
                </div>
                <div className="flex items-center text-sm text-slate-600">
                  <Clock className="h-4 w-4 mr-1" />
                  {featuredPost.readTime}
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">{featuredPost.title}</h2>
              <p className="text-slate-600 mb-6">{featuredPost.excerpt}</p>
              <Button asChild className="w-fit">
                <Link href={`/blog/${featuredPost.id}`}>
                  Read More
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((category) => (
          <Button key={category} variant="outline" size="sm">
            {category}
          </Button>
        ))}
      </div>

      {/* Blog Posts Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {regularPosts.map((post) => (
          <Card key={post.id} className="group hover:shadow-lg transition-shadow">
            <div className="relative h-48 overflow-hidden rounded-t-lg">
              <Image
                src={post.image || "/placeholder.svg"}
                alt={post.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  {post.category}
                </Badge>
                <div className="flex items-center text-xs text-slate-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date(post.date).toLocaleDateString()}
                </div>
              </div>
              <CardTitle className="line-clamp-2">{post.title}</CardTitle>
              <CardDescription className="line-clamp-3">{post.excerpt}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-slate-600">
                  <Clock className="h-4 w-4 mr-1" />
                  {post.readTime}
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/blog/${post.id}`}>
                    Read More
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Newsletter Signup */}
      <div className="mt-16">
        <Card className="bg-slate-900 text-white">
          <CardContent className="p-8 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-emerald-400 mb-4" />
            <h2 className="text-2xl font-bold mb-4">Stay Updated</h2>
            <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
              Subscribe to our newsletter for the latest packaging insights, industry trends, and exclusive tips
              delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-lg text-slate-900"
              />
              <Button className="bg-emerald-600 hover:bg-emerald-700">Subscribe</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
