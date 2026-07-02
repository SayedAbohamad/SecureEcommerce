export interface RecommendationProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  oldPrice: number;
  slug?: string;
  stock: number;
  categoryId: string;
  categoryName: string;
  imageUrl: string;
  additionalImages?: string;
  sizes?: string;
  strategy: string;
  score: number;
  explanation: string;
}

export interface RecommendationSection {
  type: string;
  title: string;
  subtitle: string;
  items: RecommendationProduct[];
}

export interface RecommendationResponse {
  enabled: boolean;
  placement: string;
  generatedAt: string;
  sections: RecommendationSection[];
  message?: string;
}

export interface RecommendationRequest {
  placement?: 'home' | 'product_details' | 'cart' | 'profile' | 'dashboard';
  productId?: string;
  limit?: number;
}

export interface BehaviorEventPayload {
  eventType: string;
  productId?: string;
  searchQuery?: string;
  quantity?: number;
  source?: string;
  metadata?: Record<string, string>;
}
