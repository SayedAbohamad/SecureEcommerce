export interface PromoCode {
  id: string;
  code: string;
  description: string;
  discountType: DiscountTypeName;
  discountValue: number;
  minimumOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  maxUsageCount?: number | null;
  currentUsageCount: number;
  maxUsagePerUser?: number | null;
  startDate?: string | null;
  expirationDate?: string | null;
  applicableCategoryId?: string | null;
  applicableProductId?: string | null;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  isActive: boolean;
  createdAt: string;
  status: PromoCodeStatus;
}

export type DiscountTypeName = 'Percentage' | 'FixedAmount' | 'FreeShipping' | 'BuyXGetY';

export type PromoCodeStatus = 'Active' | 'Inactive' | 'Expired' | 'Scheduled' | 'Exhausted';

export interface PromoCodeFormInput {
  code: string;
  description: string;
  discountType: DiscountTypeName;
  discountValue: number;
  minimumOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  maxUsageCount?: number | null;
  maxUsagePerUser?: number | null;
  startDate?: string | null;
  expirationDate?: string | null;
  applicableCategoryId?: string | null;
  applicableProductId?: string | null;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  isActive: boolean;
}

export interface PromoCodeStats {
  total: number;
  active: number;
  expired: number;
  scheduled: number;
  totalUsage: number;
}
