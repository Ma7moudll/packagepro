// Mock Email Service - Frontend should call backend API
// This is a placeholder to prevent build errors

export class EmailService {
  static initialize() {
    // Mock - frontend shouldn't send emails directly
  }

  static async sendEmail(to: string, subject: string, html: string) {
    // This should call backend API
    console.log("Mock email send:", { to, subject })
  }

  static async sendWelcomeEmail(data: { email: string; name: string; role?: string }) {
    // Mock - should call backend API
    console.log("Mock welcome email:", data)
  }

  static async sendOrderConfirmation(data: any) {
    console.log("Mock order confirmation email:", data)
  }

  static async sendQuoteNotification(data: {
    customerEmail: string;
    customerName: string;
    manufacturerName: string;
    customOrderNumber?: string;
    price?: number;
    deliveryTime?: number;
    specifications?: any;
    quoteDetails?: any;
  }) {
    console.log("Mock quote notification email:", data)
  }
}
