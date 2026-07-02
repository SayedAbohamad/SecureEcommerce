import { Product } from './product';

export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Completed';

export interface OrderSummary {
  id: string;
  orderDate: string;
  status: OrderStatus | string;
  totalAmount: number;
  itemsCount: number;
  customerId?: string;
  customerName?: string | null;
  customerEmail?: string | null;
}

export interface OrderItem {
  productId: string;
  productName: string;
  pricePerUnit: number;
  quantity: number;
  subTotal: number;
  product?: Product;
}

export interface OrderDetails extends OrderSummary {
  items: OrderItem[];
  promoCode?: string | null;
  discountAmount?: number;
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus | string; // lowercase to match JSON camelCase standard
}

export interface CheckoutPayload {
  paymentMethod: string;
  promoCode?: string;
  recaptchaToken?: string;
}

export interface StripeCheckoutSessionResponse {
  url: string;
  sessionId: string;
}

export interface StripeSessionVerificationResponse {
  isPaid: boolean;
}

