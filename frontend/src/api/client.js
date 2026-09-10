import axios from 'axios';

const api = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api` 
    : '/api' 
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('madhupramaan_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('madhupramaan_token');
      localStorage.removeItem('madhupramaan_user');
    }
    return Promise.reject(err);
  }
);

export default api;
