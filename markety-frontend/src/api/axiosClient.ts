import axios from 'axios';
import { API_BASE_URL, AUTH_TOKEN_KEY, AUTH_UNAUTHORIZED_EVENT } from '../utils/constants';
import { getRecommendationSessionId } from '../utils/recommendationSession';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY) ?? sessionStorage.getItem(AUTH_TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.headers) {
    config.headers['X-Markety-Session-Id'] = getRecommendationSessionId();
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY) ?? sessionStorage.getItem(AUTH_TOKEN_KEY);
    if (error.response?.status === 401 && storedToken) {
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  },
);

export default axiosClient;

