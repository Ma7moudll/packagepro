import { z } from "zod"

// User validation schemas
export const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
})

export const userRegistrationSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"), // Changed from 8 to 1 for demo
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  role: z.enum(["TRADER", "MANUFACTURER"]),
  company: z.string().optional(),
})

// Aliases for compatibility
export const RegisterSchema = userRegistrationSchema
export const LoginSchema = loginSchema

// Product validation schemas
export const productSchema = z.object({
  name: z.string().min(3, "اسم المنتج يجب أن يكون 3 أحرف على الأقل"),
  nameEn: z.string().min(3, "English name must be at least 3 characters"),
  description: z.string().min(10, "الوصف يجب أن يكون 10 أحرف على الأقل"),
  price: z.number().positive("السعر يجب أن يكون رقماً موجباً"),
  category: z.string().min(1, "الفئة مطلوبة"),
  stock: z.number().int().nonnegative("المخزون يجب أن يكون رقماً موجباً"),
})

// Order validation schemas
export const orderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
      price: z.number().positive(),
    }),
  ),
  shippingAddress: z.object({
    street: z.string().min(5),
    city: z.string().min(2),
    postalCode: z.string().min(3),
    country: z.string().min(2),
  }),
})

// Export aliases
export const OrderSchema = orderSchema

// Product update schema
export const ProductUpdateSchema = productSchema.partial()

// Review schema
export const ReviewSchema = z.object({
  productId: z.number(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
})

// Message schema
export const MessageSchema = z.object({
  receiverId: z.number(),
  subject: z.string().optional(),
  content: z.string().min(1),
})

// Price alert schema
export const PriceAlertSchema = z.object({
  productId: z.number(),
  targetPrice: z.number().positive(),
})

// Cart validation schemas
export const cartItemSchema = z.object({
  productId: z.number(),
  quantity: z.number().int().positive(),
})

export const cartSchema = z.object({
  items: z.array(cartItemSchema),
})

// Export aliases
export const CartItemSchema = cartItemSchema

// Custom order validation schemas
export const CustomOrderSchema = z.object({
  productId: z.number().optional(),
  productName: z.string().min(3),
  quantity: z.number().int().positive(),
  specifications: z.string().min(10),
  customizations: z.record(z.any()).optional(),
  deadline: z.string().optional(),
  budgetRange: z.string().optional(),
  shippingAddress: z.object({
    street: z.string().min(5),
    city: z.string().min(2),
    postalCode: z.string().min(3),
    country: z.string().min(2),
  }),
})

// Sample request validation schemas
export const SampleRequestSchema = z.object({
  productId: z.number(),
  quantity: z.number().int().positive().max(5),
  shippingAddress: z.object({
    street: z.string().min(5),
    city: z.string().min(2),
    postalCode: z.string().min(3),
    country: z.string().min(2),
  }),
  companyName: z.string().optional(),
  notes: z.string().optional(),
})

// Search validation schemas
export const SearchSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  inStock: z.boolean().optional(),
  sortBy: z.enum(["price", "name", "rating"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
})

// Validate input
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { valid: boolean; data?: T; errors?: string[] } {
  try {
    const validated = schema.parse(data)
    return { valid: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
      return { valid: false, errors }
    }
    return { valid: false, errors: ["Validation error"] }
  }
}

// Validate request data
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): T {
  return schema.parse(data)
}
