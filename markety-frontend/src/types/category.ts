import { Product } from './product';

export interface Category {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  products?: Product[];
}

export interface CategoryFormData {
  id?: string;
  name: string;
}

