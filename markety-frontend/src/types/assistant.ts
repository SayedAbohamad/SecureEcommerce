export type AssistantIntent =
  | 'general'
  | 'search'
  | 'compare'
  | 'cart'
  | 'wishlist'
  | 'track_order'
  | 'security';

export type AssistantActionType =
  | 'login'
  | 'open_orders'
  | 'add_to_cart'
  | 'add_to_wishlist';

export interface AssistantConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantChatRequest {
  message: string;
  conversation: AssistantConversationMessage[];
}

export interface AssistantProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryName: string;
  imageUrl: string;
  sizes: string[];
}

export interface AssistantOrder {
  id: string;
  orderDate: string;
  status: string;
  totalAmount: number;
  itemsCount: number;
}

export interface AssistantAction {
  type: AssistantActionType;
  productId?: string | null;
  quantity: number;
  size?: string | null;
  label: string;
  requiresConfirmation: boolean;
}

export interface AssistantChatResponse {
  reply: string;
  intent: AssistantIntent;
  provider: 'gemini' | 'openai' | 'local' | string;
  products: AssistantProduct[];
  comparison: AssistantProduct[];
  orders: AssistantOrder[];
  action?: AssistantAction | null;
}
