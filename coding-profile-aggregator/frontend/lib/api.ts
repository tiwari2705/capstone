import axios from 'axios';

const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
if (typeof window !== 'undefined') {
  console.log(`%c [API Config] Active Base URL: ${api_url} `, 'background: #333; color: #bada55; padding: 2px 5px; border-radius: 3px;');
  if (api_url.includes('localhost') && window.location.hostname !== 'localhost') {
    console.warn('[API Warning] Your frontend is deployed but calling a localhost API. Ensure NEXT_PUBLIC_API_URL is set in Vercel!');
  }
}

const api = axios.create({
  baseURL: api_url,
  timeout: 60000, // Increased to 60s for Puppeteer scraper operations
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  // Log outgoing requests in production for easier debugging
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
  }
  
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Better diagnostic logs for the user
    if (typeof window !== 'undefined') {
      if (!err.response) {
        console.error('[API Network Error] No response from server. Check CORS settings or if backend is down.');
      } else if (err.response.status === 401) {
        console.warn('[API Auth] Session expired or invalid');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        console.error(`[API Error ${err.response.status}]`, err.response.data);
      }
    }
    return Promise.reject(err);
  }
);

export default api;
