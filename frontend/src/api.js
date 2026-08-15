import axios from 'axios';

// Create an Axios instance that defaults to pointing to the API.
// In local dev, we point it to the remote VPS at https://35.232.141.95:8443/api/v1
// In production on Vercel, this could be configured via environment variables.

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://35.232.141.95:8443/api/v1',
  withCredentials: true, // IMPORTANT: Allows cookies (session & CSRF) to be sent cross-origin
});

// Automatically extract and append the CSRF token from the cookie
api.interceptors.request.use((config) => {
  const match = document.cookie.match(new RegExp('(^| )csrf_token=([^;]+)'));
  if (match) {
    config.headers['X-CSRF-Token'] = match[2];
  }
  return config;
});

export default api;
