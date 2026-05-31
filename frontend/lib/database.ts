// Database helper - simplified version
// This is a placeholder that will connect to the backend API instead of directly to Prisma

export async function getPrismaClient() {
  // In a Next.js app, we typically call the backend API instead of Prisma directly
  // This is a placeholder - actual implementation would call the backend
  throw new Error('Use API calls to backend instead of direct database access')
}

// Export a mock prisma-like object for compatibility
export const prisma = {
  user: {
    count: async () => 0,
    findMany: async () => [],
  },
  product: {
    count: async () => 0,
    groupBy: async () => [],
    findMany: async () => [],
  },
  order: {
    count: async () => 0,
    findMany: async () => [],
  },
}

// Mock DatabaseService
export class DatabaseService {
  static async getAllProducts(options?: any): Promise<any[]> {
    return [];
  }

  static async getProductById(id: number) {
    return null as {
      id: number;
      name: string;
      price: number;
      stock: number;
      isActive: boolean;
      isApproved: boolean;
      category?: string;
      images?: string[];
      [key: string]: any;
    } | null;
  }

  static async createProduct(data: any): Promise<any> {
    return {
      id: Date.now(),
      name: data.name || '',
      nameEn: data.nameEn || '',
      price: data.price || 0,
      stock: data.stock || 0,
      images: data.images || [],
      isActive: data.isActive ?? true,
      ...data
    };
  }

  static async updateProduct(id: number, data: any) {
    return {
      id,
      ...data,
      updatedAt: new Date(),
    };
  }

  static async deleteProduct(id: number) {
    return true;
  }

  static async createOrder(data: any) {
    return { id: 'mock' };
  }

  static async getUserOrders(userId: number, filters?: any) {
    return [];
  }

  static async getOrderStats(days: number = 30) {
    return {
      byStatus: [],
      totalOrders: 0,
      period: days,
    };
  }

  static async getTopProducts(limit: number = 10, days: number = 30) {
    return [];
  }

  static async getManufacturerAnalytics(manufacturerId: number, days: number = 30) {
    return {
      productViews: 0,
      orders: 0,
      revenue: 0,
      topProducts: [],
      customerRegions: [],
    };
  }

  // Cart methods
  static async getCartItems(userId: number) {
    return [] as Array<{
      id: string | number;
      productId: number;
      quantity: number;
      size?: string;
      color?: string;
      customizationDetails?: any;
    }>;
  }

  static async addToCart(data: {
    userId: number;
    productId: number;
    quantity: number;
    size?: string;
    color?: string;
    customizationDetails?: any;
  }) {
    return {
      id: 'mock-cart-item',
      userId: data.userId,
      productId: data.productId,
      quantity: data.quantity,
      size: data.size,
      color: data.color,
      customizationDetails: data.customizationDetails,
    };
  }

  static async updateCartItem(cartItemId: number, quantity: number) {
    return {
      id: cartItemId,
      quantity,
    };
  }

  static async removeFromCart(cartItemId: number) {
    return { success: true };
  }

  static async findGroupBuyingOpportunities(productId: number, quantity: number) {
    return null;
  }

  // Review methods
  static async getProductReviews(productId: number) {
    return [];
  }

  static async createReview(data: {
    userId: number;
    productId: number;
    rating: number;
    comment?: string;
    images?: string[];
  }) {
    return {
      id: 'mock-review',
      userId: data.userId,
      productId: data.productId,
      rating: data.rating,
      comment: data.comment,
      images: data.images || [],
      createdAt: new Date(),
    };
  }

  // Search methods
  static async logSearchQuery(query: string, userId?: number, resultsCount?: number) {
    return { success: true };
  }

  // Quote methods
  static async getQuotesByManufacturer?(manufacturerId: number, filters?: { customOrderId?: string; status?: string }) {
    return [];
  }

  static async getQuotesByCustomOrder?(customOrderId: string) {
    return [];
  }

  static async getQuotesByTrader?(traderId: number, filters?: { status?: string }) {
    return [];
  }

  static async getAllQuotes?(filters?: { customOrderId?: string; status?: string }) {
    return [];
  }

  // Market insights
  static async getMarketInsights(category?: string) {
    return {
      trendingProducts: [],
      priceTrends: [],
      categoryInsights: {},
    };
  }

  // User methods
  static async getUserById(userId: number) {
    return {
      id: userId,
      name: 'Mock User',
      email: 'mock@example.com',
    };
  }

  // Message methods
  static async sendMessage(data: {
    senderId: number;
    receiverId: number;
    subject?: string;
    content: string;
    attachments?: string[];
  }) {
    return {
      id: 'mock-message',
      senderId: data.senderId,
      receiverId: data.receiverId,
      subject: data.subject,
      content: data.content,
      attachments: data.attachments || [],
      createdAt: new Date(),
    };
  }

  static async getConversation(userId1: number, userId2: number) {
    return [];
  }

  // Custom Order methods
  static async createCustomOrder(data: any) {
    return {
      id: 'mock-custom-order',
      ...data,
      createdAt: new Date(),
    };
  }

  static async getCustomOrdersForManufacturer(manufacturerId: number) {
    return [];
  }

  static async getCustomOrderById(customOrderId: string) {
    return {
      id: customOrderId,
      title: 'Mock Custom Order',
      description: 'Mock description',
      traderId: 1,
      customerEmail: 'customer@example.com',
      customerName: 'Mock Customer',
      requestNumber: `REQ-${customOrderId}`,
      specifications: {},
      status: 'pending',
    };
  }

  // Quote methods
  static async createQuote(data: {
    customOrderId: string;
    manufacturerId: number;
    price: number;
    quantity: number;
    deliveryTime: number;
    specifications: any;
    validUntil: Date;
  }) {
    return {
      id: 'mock-quote',
      ...data,
      status: 'pending',
      createdAt: new Date(),
    };
  }

  static async getQuotesByManufacturer(manufacturerId: number, filters?: { customOrderId?: string; status?: string }): Promise<any[]> {
    return [];
  }

  static async getQuotesByCustomOrder(customOrderId: string): Promise<any[]> {
    return [];
  }

  static async getQuotesByTrader(traderId: number, filters?: { status?: string }): Promise<any[]> {
    return [];
  }

  static async getAllQuotes(filters?: { customOrderId?: string; status?: string }): Promise<any[]> {
    return [];
  }

  // Order methods
  static async updateOrderStatus(orderId: string | number, status: string) {
    return { success: true };
  }

  static async getOrderById(orderId: string | number) {
    return null as {
      id: string | number;
      orderNumber: string;
      totalAmount: number;
      customer?: {
        email?: string;
        name?: string;
      };
      items: Array<{
        productName: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }>;
      [key: string]: any;
    } | null;
  }

  // Supplier methods
  static async getSupplierAnalytics(supplierId: number, days: number = 30) {
    return {
      orders: 0,
      revenue: 0,
      topProducts: [],
    };
  }

  // Admin methods
  static async getAdminAnalytics(days: number = 30) {
    return {
      totalUsers: 0,
      totalOrders: 0,
      totalRevenue: 0,
      totalProducts: 0,
    };
  }

  // Trader methods
  static async getTraderAnalytics(traderId: number, days: number = 30) {
    return {
      orders: 0,
      revenue: 0,
      topProducts: [],
    };
  }

  // Loyalty methods
  static async getUserLoyaltyPoints(userId: number) {
    return 0;
  }

  static async redeemLoyaltyPoints(userId: number, points: number, description?: string) {
    return {
      id: 'mock-redemption',
      userId,
      points,
      description,
      createdAt: new Date(),
    };
  }

  static async createPriceAlert(data: any) {
    return {
      id: 'mock-price-alert',
      ...data,
      createdAt: new Date(),
    };
  }
}
