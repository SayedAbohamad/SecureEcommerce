export interface CartItemPayload {
  productId: string;
  quantity: number;
  size?: string; // Selected size
}

export interface CartItem {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  size?: string; // Selected size
  myTotal: number;
}

