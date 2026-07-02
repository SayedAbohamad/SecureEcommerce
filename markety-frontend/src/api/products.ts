import axiosClient from './axiosClient';
import { Product, ProductFormInput } from '../types';
import { GenerateProductContentRequest, GeneratedProductContent } from '../types/productAi';

const resource = 'Product';

const buildProductFormData = (payload: ProductFormInput) => {
  const formData = new FormData();
  formData.append('Name', payload.name);
  formData.append('Description', payload.description);
  formData.append('Price', payload.price.toString());
  formData.append('Stock', payload.stock.toString());
  formData.append('CategoryId', payload.categoryId);
  formData.append('Slug', payload.slug || '');
  formData.append('Sizes', JSON.stringify(payload.sizes || []));
  if (payload.image) {
    formData.append('Image', payload.image);
  }
  if (payload.additionalImages && payload.additionalImages.length > 0) {
    payload.additionalImages.forEach((file) => {
      formData.append('AdditionalImages', file);
    });
  }
  return formData;
};

export const productApi = {
  async getAll(): Promise<Product[]> {
    const { data } = await axiosClient.get<Product[]>(resource);
    return data;
  },

  async getCatalog(): Promise<Product[]> {
    const { data } = await axiosClient.get<Product[]>(`${resource}/GetProduct2`);
    // Parse sizes from JSON string if present
    return data.map(product => ({
      ...product,
      sizes: product.sizes ? (typeof product.sizes === 'string' ? JSON.parse(product.sizes) : product.sizes) : undefined
    }));
  },

  async getById(id: string): Promise<Product> {
    const { data } = await axiosClient.get<Product>(`${resource}/${id}`);
    // Parse sizes from JSON string if present
    return {
      ...data,
      sizes: data.sizes ? (typeof data.sizes === 'string' ? JSON.parse(data.sizes) : data.sizes) : undefined
    };
  },

  async create(payload: ProductFormInput): Promise<Product> {
    const formData = buildProductFormData(payload);
    const { data } = await axiosClient.post<Product>(resource, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async update(id: string, payload: ProductFormInput): Promise<void> {
    const formData = buildProductFormData(payload);
    await axiosClient.put(`${resource}/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  async remove(id: string): Promise<void> {
    await axiosClient.delete(`${resource}/${id}`);
  },

  async generateAiContent(request: GenerateProductContentRequest): Promise<GeneratedProductContent> {
    const { data } = await axiosClient.post<GeneratedProductContent>(`${resource}/ai/generate-content`, request);
    return data;
  },
};

