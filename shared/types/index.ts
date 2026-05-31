// Shared types between frontend and backend

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
}

export type OrderStatus =
  | 'pending_review'
  | 'awaiting_approval'
  | 'ready_for_routing'
  | 'vendor_confirmed'
  | 'in_production'
  | 'quality_check'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export interface PricingRequest {
  productType: 'box' | 'bag' | 'label';
  quantity: number;
  dimensions: {
    length: number;
    width: number;
    height?: number;
    unit: 'cm' | 'mm' | 'inch';
  };
  materialCode?: string;
}

export interface PricingResponse {
  total: number;
  subtotal: number;
  shippingEstimate: number;
  material: {
    code: string;
    name: string;
  };
}
