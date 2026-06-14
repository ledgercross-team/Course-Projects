// frontend/src/lib/apiClient.js
export function buildAuthHeaders({ accessToken, userId } = {}) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (userId && import.meta.env.VITE_DEV_AUTH === 'true') {
    headers['x-user-id'] = userId;
  } else if (!accessToken && import.meta.env.VITE_DEV_USER_ID) {
    headers['x-user-id'] = import.meta.env.VITE_DEV_USER_ID;
  }

  return headers;
}

export function getApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL !== undefined) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return '';
}
