import axios from 'axios';

const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
if (typeof window !== 'undefined') {
  console.log(`[API Config] Active Base URL: ${api_url}`);
}

const api = axios.create({
  baseURL: api_url,
  timeout: 15000,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
