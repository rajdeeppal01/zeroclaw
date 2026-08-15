import axios from 'axios';

// Create an Axios instance that defaults to pointing to the API.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
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
