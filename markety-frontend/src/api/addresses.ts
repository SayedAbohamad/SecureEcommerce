import axiosClient from './axiosClient';

const formHeaders = { headers: { 'Content-Type': 'multipart/form-data' } };

export interface UserAddress {
  id: string;
  userId: string;
  street: string;
  city: string;
  state?: string;
  country?: string;
  zipCode?: string;
  isDefault: boolean;
}

export interface AddressDto {
  street: string;
  city: string;
  state?: string;
  country?: string;
  zipCode?: string;
  isDefault: boolean;
}

export const addressApi = {
  async getAll(): Promise<UserAddress[]> {
    const { data } = await axiosClient.get<UserAddress[]>('Address');
    return data;
  },

  async add(model: AddressDto): Promise<UserAddress> {
    const formData = new FormData();
    formData.append('Street', model.street);
    formData.append('City', model.city);
    if (model.state) formData.append('State', model.state);
    if (model.country) formData.append('Country', model.country);
    if (model.zipCode) formData.append('ZipCode', model.zipCode);
    formData.append('IsDefault', model.isDefault.toString());
    const { data } = await axiosClient.post<UserAddress>('Address', formData, formHeaders);
    return data;
  },

  async update(id: string, model: AddressDto): Promise<UserAddress> {
    const formData = new FormData();
    formData.append('Street', model.street);
    formData.append('City', model.city);
    if (model.state) formData.append('State', model.state);
    if (model.country) formData.append('Country', model.country);
    if (model.zipCode) formData.append('ZipCode', model.zipCode);
    formData.append('IsDefault', model.isDefault.toString());
    const { data } = await axiosClient.put<UserAddress>(`Address/${id}`, formData, formHeaders);
    return data;
  },

  async delete(id: string): Promise<void> {
    await axiosClient.delete(`Address/${id}`);
  },

  async setDefault(id: string): Promise<void> {
    await axiosClient.post(`Address/${id}/set-default`);
  },
};
