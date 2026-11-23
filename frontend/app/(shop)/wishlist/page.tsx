"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, ShoppingCart, Trash2, Share2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/providers/auth-provider"
import { useCart } from "@/providers/cart-provider"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/providers/language-provider"

interface WishlistItem {
  id: string
  name: string
  price: number
  image: string
  category: string
  inStock: boolean
}

export default function WishlistPage() {
  const { user } = useAuth()
  const { addItem } = useCart()
  const { toast } = useToast()
  const { language } = useLanguage()
  const router = useRouter()
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    // Mock wishlist data
    const mockWishlist: WishlistItem[] = [
      {
        id: "1",
        name: "Premium Corrugated Boxes",
        price: 2.5,
        image: "/placeholder.svg?height=300&width=300",
        category: "B2B",
        inStock: true,
      },
      {
        id: "3",
        name: "Elegant Gift Boxes",
        price: 4.99,
        image: "/placeholder.svg?height=300&width=300",
        category: "Events",
        inStock: true,
      },
      {
        id: "5",
        name: "Wedding Favor Boxes",
        price: 2.99,
        image: "/placeholder.svg?height=300&width=300",
        category: "Events",
        inStock: false,
      },
    ]

    setWishlistItems(mockWishlist)
  }, [user, router])

  const removeFromWishlist = (itemId: string) => {
    setWishlistItems((items) => items.filter((item) => item.id !== itemId))
    toast({
      title: language === "ar" ? "تم الحذف" : "Removed from wishlist",
      description: language === "ar" ? "تم حذف المنتج من المفضلة" : "Item has been removed from your wishlist.",
    })
  }

  const addToCart = async (item: WishlistItem) => {
    try {
      await addItem({
        productType: "box",
        name: item.name,
        quantity: 1,
        dimensions: { length: 100, width: 100, height: 50, unit: "mm" },
        materialCode: "kraft",
        image: item.image,
      })
    } catch {
      toast({
        title: language === "ar" ? "تسجيل الدخول مطلوب" : "Sign in required",
        description: language === "ar" ? "يرجى تسجيل الدخول لإضافة المنتجات إلى السلة" : "Please sign in to add items to your cart.",
        variant: "destructive",
      })
      return
    }
    toast({
      title: language === "ar" ? "تم الإضافة" : "Added to cart",
      description:
        language === "ar"
          ? `تم إضافة ${item.name} إلى السلة`
          : `${item.name} has been added to your cart.`,
    })
  }

  const shareWishlist = () => {
    navigator.clipboard.writeText(window.location.href)
    toast({
      title: language === "ar" ? "تم النسخ" : "Link copied",
      description: language === "ar" ? "تم نسخ رابط المفضلة" : "Wishlist link has been copied to clipboard.",
    })
  }

  if (!user) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {language === "ar" ? "قائمة المفضلة" : "My Wishlist"}
            </h1>
            <p className="text-slate-600">
              {language === "ar" ? "احفظ حلول التعبئة والتغليف المفضلة لديك" : "Save your favorite packaging solutions"}
            </p>
          </div>
          <Button variant="outline" onClick={shareWishlist}>
            <Share2 className={`h-4 w-4 ${language === "ar" ? "ml-2" : "mr-2"}`} />
            {language === "ar" ? "مشاركة القائمة" : "Share Wishlist"}
          </Button>
        </div>
      </div>

      {wishlistItems.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Heart className="mx-auto h-16 w-16 text-slate-300 mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Your Wishlist is Empty</h2>
            <p className="text-slate-600 mb-6">Start adding products to your wishlist to save them for later.</p>
            <Button asChild>
              <Link href="/products">Browse Products</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistItems.map((item) => (
            <Card key={item.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="p-0">
                <div className="relative overflow-hidden rounded-t-lg">
                  <Image
                    src={item.image || "/placeholder.svg"}
                    alt={item.name}
                    width={300}
                    height={300}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 bg-white hover:bg-white shadow-lg"
                    onClick={() => removeFromWishlist(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                  <Badge className="absolute top-2 left-2" variant="secondary">
                    {item.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <CardTitle className="mb-2">{item.name}</CardTitle>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold text-emerald-600">EGP {item.price.toFixed(2)}</span>
                  <Badge variant={item.inStock ? "default" : "destructive"}>
                    {item.inStock ? "In Stock" : "Out of Stock"}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Button className="w-full" onClick={() => addToCart(item)} disabled={!item.inStock}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {item.inStock ? "Add to Cart" : "Out of Stock"}
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/products/${item.id}`}>View Details</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
