import axiosClient from './axiosClient';
import { AuthResponse, AuthUser, LoginPayload, RegisterPayload } from '../types';

const formHeaders = { headers: { 'Content-Type': 'multipart/form-data' } };

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const formData = new FormData();
    formData.append('Email', payload.email);
    formData.append('Password', payload.password);
    formData.append('RememberMe', (payload.rememberMe ?? false).toString());
    const { data } = await axiosClient.post<AuthResponse>('Auth/Login', formData, formHeaders);
    return data;
  },

  async register(payload: RegisterPayload): Promise<{ message: string }> {
    const formData = new FormData();
    formData.append('FullName', payload.fullName);
    formData.append('Email', payload.email);
    formData.append('Password', payload.password);
    formData.append('Role', payload.role ?? 'Customer');
    const { data } = await axiosClient.post<{ message: string }>('Auth/Register', formData, formHeaders);
    return data;
  },

  async confirmRegistration(payload: { email: string; code: string }): Promise<{ message: string }> {
    const formData = new FormData();
    formData.append('Email', payload.email);
    formData.append('Code', payload.code);
    const { data } = await axiosClient.post<{ message: string }>('Auth/VerifyRegistration', formData, formHeaders);
    return data;
  },

  async resendRegistrationOtp(email: string): Promise<{ message: string }> {
    const formData = new FormData();
    formData.append('email', email);
    const { data } = await axiosClient.post<{ message: string }>('Auth/ResendRegistrationOtp', formData, formHeaders);
    return data;
  },

  async getCurrentUser(): Promise<AuthUser> {
    const { data } = await axiosClient.get<AuthUser>('Auth/CurrentUser');
    return data;
  },

  async getGoogleConfig(): Promise<{ enabled: boolean; clientId: string }> {
    const { data } = await axiosClient.get<{ enabled: boolean; clientId: string }>('Auth/GoogleConfig');
    return data;
  },

  async googleAuth(credential: string): Promise<AuthResponse> {
    const { data } = await axiosClient.post<AuthResponse>('Auth/Google', {
      credential,
    });
    return data;
  },

  async verify2FA(payload: { email: string; code: string }): Promise<AuthResponse> {
    const formData = new FormData();
    formData.append('Email', payload.email);
    formData.append('Code', payload.code);
    const { data } = await axiosClient.post<AuthResponse>('Auth/Verify2FA', formData, formHeaders);
    return data;
  },

  async requestPasswordChange(): Promise<{ message: string }> {
    const { data } = await axiosClient.post('Auth/RequestPasswordChange');
    return data;
  },

  async confirmPasswordChange(code: string, newPassword: string): Promise<{ message: string }> {
    const formData = new FormData();
    formData.append('code', code);
    formData.append('newPassword', newPassword);
    const { data } = await axiosClient.post('Auth/ConfirmPasswordChange', formData, formHeaders);
    return data;
  },

  async requestEmailChange(newEmail: string): Promise<{ message: string }> {
    const { data } = await axiosClient.patch('profile/email/request', { newEmail });
    return data;
  },

  async verifyOldEmail(otp: string): Promise<{ changeEmailToken: string }> {
    const { data } = await axiosClient.post<{ changeEmailToken: string }>('profile/email/verify-old', { otp });
    return data;
  },

  async sendNewOtp(newEmail: string, changeEmailToken: string): Promise<{ message: string }> {
    const { data } = await axiosClient.post('profile/email/send-new-otp', { newEmail, changeEmailToken });
    return data;
  },

  async confirmEmailChange(otp: string, changeEmailToken: string): Promise<{ message: string }> {
    const { data } = await axiosClient.post('profile/email/confirm', { otp, changeEmailToken });
    return data;
  },

  async updateProfile(payload: { fullName: string; phoneNumber?: string; address?: string; dateOfBirth?: string }): Promise<AuthResponse> {
    const formData = new FormData();
    formData.append('FullName', payload.fullName);
    if (payload.phoneNumber) formData.append('PhoneNumber', payload.phoneNumber);
    if (payload.address) formData.append('Address', payload.address);
    if (payload.dateOfBirth) formData.append('DateOfBirth', payload.dateOfBirth);
    const { data } = await axiosClient.post<AuthResponse>('Auth/UpdateProfile', formData, formHeaders);
    return data;
  },

  async toggleTwoFactor(enabled: boolean): Promise<{ message: string; twoFactorEnabled: boolean }> {
    const formData = new FormData();
    formData.append('enabled', enabled.toString());
    const { data } = await axiosClient.post<{ message: string; twoFactorEnabled: boolean }>('Auth/ToggleTwoFactor', formData, formHeaders);
    return data;
  },

  async resend2FA(email: string): Promise<{ message: string }> {
    const formData = new FormData();
    formData.append('email', email);
    const { data } = await axiosClient.post('Auth/Resend2FA', formData, formHeaders);
    return data;
  },

  async forgotPassword(email: string, recaptchaToken?: string): Promise<{ message: string }> {
    const formData = new FormData();
    formData.append('email', email);
    if (recaptchaToken) {
      formData.append('RecaptchaToken', recaptchaToken);
    }
    const { data } = await axiosClient.post<{ message: string }>('Auth/ForgotPassword', formData, formHeaders);
    return data;
  },

  async resetPassword(payload: { email: string; token: string; newPassword: string }): Promise<{ message: string }> {
    const formData = new FormData();
    formData.append('email', payload.email);
    formData.append('token', payload.token);
    formData.append('newPassword', payload.newPassword);
    const { data } = await axiosClient.post<{ message: string }>('Auth/ResetPassword', formData, formHeaders);
    return data;
  },

  async requestAccountDeletion(password: string): Promise<{ message: string }> {
    const { data } = await axiosClient.post<{ message: string }>('profile/delete-request', { password });
    return data;
  },

  async confirmAccountDeletion(password: string, otp: string): Promise<{ message: string }> {
    const { data } = await axiosClient.post<{ message: string }>('profile/delete-confirm', { password, otp });
    return data;
  },
};

