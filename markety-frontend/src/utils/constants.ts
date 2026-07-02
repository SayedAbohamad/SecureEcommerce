export const AUTH_TOKEN_KEY = 'markety.auth.token';
export const AUTH_USER_KEY = 'markety.auth.user';
export const AUTH_UNAUTHORIZED_EVENT = 'markety:auth-unauthorized';
// For same-origin deployment, use relative URL. For separate hosts, use environment variable
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL ?? '/api';
export const API_ASSET_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '') || '';

