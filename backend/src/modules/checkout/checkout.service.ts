import { prisma } from '../../lib/prisma';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { cartService } from '../cart/cart.service';
import { orderService } from '../orders/order.service';
import { stripeService } from '../../integrations/stripe/stripe.service';

export interface CheckoutShippingAddress {
  name: string;
  phone: string;
  email?: string;
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface CheckoutInput {
  customerId: string;
  shippingAddress: CheckoutShippingAddress;
  notes?: string;
  designSessionId?: string;
}

export class CheckoutService {
  /**
   * Server-authoritative cart summary used on the checkout page.
   */
  async getSummary(customerId: string) {
    return cartService.getCart(customerId);
  }

  /**
   * Checkout is order-first: a real `pending_review` order is created from the
   * server cart, then a Stripe PaymentIntent is created against it, then the
   * cart is cleared. The order lifecycle (payment webhook -> awaiting_approval)
   * is unchanged.
   */
  async checkout(customerId: string, input: CheckoutInput) {
    const cart = await cartService.getCart(customerId);

    if (cart.items.length === 0) {
      throw new ValidationError('Cart is empty');
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { user: true },
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    const order = await orderService.createOrder({
      customerId,
      items: cart.items.map((item) => ({
        productType: item.productType,
        quantity: item.quantity,
        dimensions: item.dimensions,
        materialCode: item.materialCode || undefined,
        color: item.color || undefined,
        finish: item.finish || undefined,
        // M7/M7-E: Pass through catalog + design traceability fields
        productId: item.productId || undefined,
        variantId: item.variantId || undefined,
        sku: item.sku || undefined,
        config: item.config || undefined,
        designId: item.designId || undefined,
        templateId: item.templateId || undefined,
        sessionId: item.sessionId || undefined,
      })),
      shippingAddress: input.shippingAddress,
      notes: input.notes,
      designSessionId: input.designSessionId,
    });

    const paymentIntent = await stripeService.createPaymentIntent({
      orderId: order.id,
      amount: Number(order.total),
      currency: 'usd',
      customerEmail: customer.user.email,
    });

    await cartService.clear(customerId);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      status: order.status,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }
}

export const checkoutService = new CheckoutService();