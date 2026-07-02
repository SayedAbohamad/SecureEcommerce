import { createContext, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api';
import { AuthResponse, AuthUser, LoginPayload, RegisterPayload } from '../types';
import { AUTH_TOKEN_KEY, AUTH_UNAUTHORIZED_EVENT, AUTH_USER_KEY } from '../utils/constants';

const getJwtExpirationMs = (jwt: string): number | null => {
  try {
    const encodedPayload = jwt.split('.')[1];
    if (!encodedPayload) return null;

    const normalizedPayload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - normalizedPayload.length % 4) % 4),
      '=',
    );
    const payload = JSON.parse(window.atob(paddedPayload)) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<AuthResponse>;
  googleLogin: (credential: string, rememberMe?: boolean) => Promise<void>;
  verify2FA: (email: string, code: string, rememberMe?: boolean) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshCurrentUser: () => Promise<void>;
  requestPasswordChange: () => Promise<void>;
  confirmPasswordChange: (code: string, newPassword: string) => Promise<void>;
  requestEmailChange: (newEmail: string) => Promise<void>;
  verifyOldEmail: (otp: string) => Promise<{ changeEmailToken: string }>;
  sendNewOtp: (newEmail: string, changeEmailToken: string) => Promise<void>;
  confirmEmailChange: (otp: string, changeEmailToken: string) => Promise<void>;
  updateProfile: (payload: { fullName: string; phoneNumber?: string; address?: string; dateOfBirth?: string }) => Promise<void>;
  toggleTwoFactor: (enabled: boolean) => Promise<void>;
  resend2FA: (email: string) => Promise<void>;
  hasRole: (role: string) => boolean;
  requestAccountDeletion: (password: string) => Promise<void>;
  confirmAccountDeletion: (password: string, otp: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const getStoredToken = useCallback(() => {
    return localStorage.getItem(AUTH_TOKEN_KEY) ?? sessionStorage.getItem(AUTH_TOKEN_KEY);
  }, []);

  const getStoredUser = useCallback((): AuthUser | null => {
    const storedUser = localStorage.getItem(AUTH_USER_KEY) ?? sessionStorage.getItem(AUTH_USER_KEY);
    if (!storedUser) return null;
    try {
      return JSON.parse(storedUser);
    } catch {
      localStorage.removeItem(AUTH_USER_KEY);
      sessionStorage.removeItem(AUTH_USER_KEY);
      return null;
    }
  }, []);

  const persist = useCallback((nextToken: string | null, nextUser: AuthUser | null, remember = false) => {
    if (nextToken) {
      if (remember) {
        localStorage.setItem(AUTH_TOKEN_KEY, nextToken);
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
      } else {
        sessionStorage.setItem(AUTH_TOKEN_KEY, nextToken);
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
      setToken(nextToken);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      setToken(null);
    }

    if (nextUser) {
      const userValue = JSON.stringify(nextUser);
      if (remember) {
        localStorage.setItem(AUTH_USER_KEY, userValue);
        sessionStorage.removeItem(AUTH_USER_KEY);
      } else {
        sessionStorage.setItem(AUTH_USER_KEY, userValue);
        localStorage.removeItem(AUTH_USER_KEY);
      }
      setUser(nextUser);
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
      sessionStorage.removeItem(AUTH_USER_KEY);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    const expiration = storedToken ? getJwtExpirationMs(storedToken) : null;

    if (storedToken && expiration !== null && expiration <= Date.now()) {
      persist(null, null);
      setLoading(false);
      return;
    }

    if (storedToken) {
      setToken(storedToken);
    }
    if (storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, [getStoredToken, getStoredUser, persist]);

  useEffect(() => {
    const handleUnauthorized = () => persist(null, null);
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [persist]);

  useEffect(() => {
    if (!token) return;

    const expiration = getJwtExpirationMs(token);
    if (expiration === null) return;

    const remainingMs = expiration - Date.now();
    if (remainingMs <= 0) {
      persist(null, null);
      return;
    }

    const timeoutId = window.setTimeout(
      () => persist(null, null),
      Math.min(remainingMs, 2_147_483_647),
    );
    return () => window.clearTimeout(timeoutId);
  }, [token, persist]);

  useEffect(() => {
    const shouldFetchUser = token && !user;
    if (!shouldFetchUser) {
      return;
    }
    setLoading(true);
    authApi
      .getCurrentUser()
      .then((nextUser) => {
        const remember = Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
        persist(getStoredToken(), nextUser, remember);
      })
      .catch(() => {
        persist(null, null);
      })
      .finally(() => setLoading(false));
  }, [token, user, persist, getStoredToken]);

  const refreshCurrentUser = useCallback(async () => {
    const nextUser = await authApi.getCurrentUser();
    const remember = Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
    persist(getStoredToken(), nextUser, remember);
  }, [persist, getStoredToken]);

  const login = useCallback(
    async (payload: LoginPayload): Promise<AuthResponse> => {
      const response = await authApi.login(payload);
      if (response.token) {
        persist(response.token, null, payload.rememberMe ?? false);
        await refreshCurrentUser();
      }
      return response;
    },
    [persist, refreshCurrentUser],
  );

  const googleLogin = useCallback(
    async (credential: string, rememberMe = true) => {
      const response = await authApi.googleAuth(credential);
      persist(response.token, null, rememberMe);
      await refreshCurrentUser();
    },
    [persist, refreshCurrentUser],
  );

  const verify2FA = useCallback(
    async (email: string, code: string, rememberMe = false) => {
      const response = await authApi.verify2FA({ email, code });
      persist(response.token, null, rememberMe);
      await refreshCurrentUser();
    },
    [persist, refreshCurrentUser],
  );

  const register = useCallback(async (payload: RegisterPayload) => {
    await authApi.register(payload);
  }, []);

  const logout = useCallback(() => {
    persist(null, null);
  }, [persist]);

  const requestPasswordChange = useCallback(async () => {
    await authApi.requestPasswordChange();
  }, []);

  const confirmPasswordChange = useCallback(async (code: string, newPassword: string) => {
    await authApi.confirmPasswordChange(code, newPassword);
  }, []);

  const requestEmailChange = useCallback(async (newEmail: string) => {
    await authApi.requestEmailChange(newEmail);
  }, []);

  const verifyOldEmail = useCallback(async (otp: string) => {
    return await authApi.verifyOldEmail(otp);
  }, []);

  const sendNewOtp = useCallback(async (newEmail: string, changeEmailToken: string) => {
    await authApi.sendNewOtp(newEmail, changeEmailToken);
  }, []);

  const confirmEmailChange = useCallback(async (otp: string, changeEmailToken: string) => {
    await authApi.confirmEmailChange(otp, changeEmailToken);
    await refreshCurrentUser();
  }, [refreshCurrentUser]);

  const updateProfile = useCallback(async (payload: { fullName: string; phoneNumber?: string; address?: string; dateOfBirth?: string }) => {
    await authApi.updateProfile(payload);
    await refreshCurrentUser();
  }, [refreshCurrentUser]);

  const toggleTwoFactor = useCallback(async (enabled: boolean) => {
    await authApi.toggleTwoFactor(enabled);
    await refreshCurrentUser();
  }, [refreshCurrentUser]);

  const resend2FA = useCallback(async (email: string) => {
    await authApi.resend2FA(email);
  }, []);

  const hasRole = useCallback(
    (role: string) => {
      if (!user) return false;
      return user.roles.map((r) => r.toLowerCase()).includes(role.toLowerCase());
    },
    [user],
  );

  const requestAccountDeletion = useCallback(async (password: string) => {
    await authApi.requestAccountDeletion(password);
  }, []);

  const confirmAccountDeletion = useCallback(async (password: string, otp: string) => {
    await authApi.confirmAccountDeletion(password, otp);
    logout();
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login,
      googleLogin,
      verify2FA,
      register,
      logout,
      refreshCurrentUser,
      requestPasswordChange,
      confirmPasswordChange,
      requestEmailChange,
      verifyOldEmail,
      sendNewOtp,
      confirmEmailChange,
      updateProfile,
      toggleTwoFactor,
      resend2FA,
      hasRole,
      requestAccountDeletion,
      confirmAccountDeletion,
    }),
    [user, token, loading, login, googleLogin, verify2FA, register, logout, refreshCurrentUser, requestPasswordChange, confirmPasswordChange, requestEmailChange, verifyOldEmail, sendNewOtp, confirmEmailChange, updateProfile, toggleTwoFactor, resend2FA, hasRole, requestAccountDeletion, confirmAccountDeletion],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

