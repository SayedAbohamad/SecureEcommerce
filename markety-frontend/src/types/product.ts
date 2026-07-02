export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  additionalImages?: string; // JSON array string
  categoryId: string;
  categoryName?: string;
  slug?: string;
  oldPrice?: number;
  sizes?: string[]; // Array of available sizes
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductFormInput {
  id?: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  slug?: string;
  sizes?: string[]; // Array of available sizes
  image?: File | null;
  additionalImages?: File[];
}

