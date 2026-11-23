"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, ShoppingCart, Plus, Check, Minus } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useCart } from "@/providers/cart-provider"
import { useToast } from "@/hooks/use-toast"

interface Product {
  id: string
  name: string
  price: number
  image: string
  category: string
  material: string
  minQuantity: number
  customizable: boolean
  features: string[]
  dimensions: string
  weight: string
  sustainability: string
}

export default function ComparePage() {
  const { addItem } = useCart()
  const { toast } = useToast()
  const [compareProducts, setCompareProducts] = useState<Product[]>([
    {
      id: "1",
      name: "Premium Corrugated Boxes",
      price: 2.5,
      image: "/placeholder.svg?height=300&width=300",
      category: "B2B",
      material: "Corrugated Cardboard",
      minQuantity: 100,
      customizable: true,
      features: ["Water Resistant", "Stackable", "Recyclable", "Custom Printing"],
      dimensions: '12" x 8" x 6"',
      weight: "0.5 lbs",
      sustainability: "100% Recyclable",
    },
    {
      id: "3",
      name: "Elegant Gift Boxes",
      price: 4.99,
      image: "/placeholder.svg?height=300&width=300",
      category: "Events",
      material: "Duplex Board",
      minQuantity: 25,
      customizable: true,
      features: ["Magnetic Closure", "Ribbon Ready", "Premium Finish", "Custom Printing"],
      dimensions: '10" x 10" x 4"',
      weight: "0.3 lbs",
      sustainability: "FSC Certified",
    },
    {
      id: "4",
      name: "Custom Shopping Bags",
      price: 1.25,
      image: "/placeholder.svg?height=300&width=300",
      category: "B2B",
      material: "Paper",
      minQuantity: 250,
      customizable: true,
      features: ["Reinforced Handles", "Gusseted Bottom", "Custom Printing", "Multiple Sizes"],
      dimensions: '16" x 12" x 6"',
      weight: "0.2 lbs",
      sustainability: "Biodegradable",
    },
  ])

  const removeProduct = (productId: string) => {
    setCompareProducts((products) => products.filter((p) => p.id !== productId))
  }

  const addToCart = async (product: Product) => {
    try {
      await addItem({
        productType: "box",
        name: product.name,
        quantity: product.minQuantity,
        dimensions: { length: 100, width: 100, height: 50, unit: "mm" },
        materialCode: "kraft",
        image: product.image,
      })
    } catch {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to your cart.",
        variant: "destructive",
      })
      return
    }
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    })
  }

  const allFeatures = Array.from(new Set(compareProducts.flatMap((p) => p.features)))

  if (compareProducts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Plus className="h-12 w-12 text-slate-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">No Products to Compare</h1>
          <p className="text-slate-600 mb-8">
            Add products to your comparison list to see detailed side-by-side comparisons.
          </p>
          <Button asChild>
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Product Comparison</h1>
        <p className="text-slate-600">Compare features and specifications side by side</p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Product Headers */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <div className="hidden lg:block"></div>
            {compareProducts.map((product) => (
              <Card key={product.id} className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 z-10"
                  onClick={() => removeProduct(product.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <CardHeader className="text-center">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    width={200}
                    height={200}
                    className="w-full h-40 object-cover rounded-lg mb-4"
                  />
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <div className="text-2xl font-bold text-emerald-600">EGP {product.price.toFixed(2)}</div>
                  <Badge variant="secondary">{product.category}</Badge>
                </CardHeader>
                <CardContent>
                  <Button className="w-full mb-2" onClick={() => addToCart(product)}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add to Cart
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/products/${product.id}`}>View Details</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Comparison Table */}
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-0">
                {/* Specifications */}
                <div className="space-y-0">
                  <div className="p-4 bg-slate-50 font-semibold border-b">Specifications</div>

                  <div className="p-4 border-b">
                    <span className="font-medium">Material</span>
                  </div>
                  <div className="p-4 border-b">
                    <span className="font-medium">Dimensions</span>
                  </div>
                  <div className="p-4 border-b">
                    <span className="font-medium">Weight</span>
                  </div>
                  <div className="p-4 border-b">
                    <span className="font-medium">Min. Quantity</span>
                  </div>
                  <div className="p-4 border-b">
                    <span className="font-medium">Customizable</span>
                  </div>
                  <div className="p-4 border-b">
                    <span className="font-medium">Sustainability</span>
                  </div>

                  <div className="p-4 bg-slate-50 font-semibold border-b">Features</div>
                  {allFeatures.map((feature) => (
                    <div key={feature} className="p-4 border-b">
                      <span className="font-medium">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Product Data */}
                {compareProducts.map((product) => (
                  <div key={product.id} className="space-y-0 border-l">
                    <div className="p-4 bg-slate-50 font-semibold border-b text-center">{product.name}</div>

                    <div className="p-4 border-b text-center">{product.material}</div>
                    <div className="p-4 border-b text-center">{product.dimensions}</div>
                    <div className="p-4 border-b text-center">{product.weight}</div>
                    <div className="p-4 border-b text-center">{product.minQuantity}</div>
                    <div className="p-4 border-b text-center">
                      {product.customizable ? (
                        <Check className="h-5 w-5 text-green-600 mx-auto" />
                      ) : (
                        <Minus className="h-5 w-5 text-slate-400 mx-auto" />
                      )}
                    </div>
                    <div className="p-4 border-b text-center">{product.sustainability}</div>

                    <div className="p-4 bg-slate-50 border-b"></div>
                    {allFeatures.map((feature) => (
                      <div key={feature} className="p-4 border-b text-center">
                        {product.features.includes(feature) ? (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <Minus className="h-5 w-5 text-slate-400 mx-auto" />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <Button variant="outline" asChild>
              <Link href="/products">Add More Products</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
