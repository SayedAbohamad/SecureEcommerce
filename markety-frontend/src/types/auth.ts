export type Role = 'Admin' | 'Manager' | 'Customer';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  createdAt?: string;
  lastLogin?: string;
  dateOfBirth?: string;
  twoFactorEnabled?: boolean;
  roles: Role[];
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role?: Role;
}

export interface AuthResponse {
  token: string;
  expires: string;
  requires2FA?: boolean;
  email?: string;
  message?: string;
}

export interface Verify2FAPayload {
  email: string;
  code: string;
}

