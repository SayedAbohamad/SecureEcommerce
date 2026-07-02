import { API_ASSET_BASE_URL } from './constants';

export const resolveImageUrl = (path?: string | null) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  if (path.startsWith('/')) {
    return `${API_ASSET_BASE_URL}${path}`;
  }
  return `${API_ASSET_BASE_URL}/${path}`;
};

