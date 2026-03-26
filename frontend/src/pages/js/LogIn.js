// services/api.js
import axios from 'axios';

const API_URL = '/api/';

// Создаем экземпляр axios с базовыми настройками
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Создаем защищенный экземпляр
const api_protected = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Переменная для предотвращения множественных редиректов
let isRedirecting = false;

// Интерсептор для запросов защищенного API
api_protected.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Если нет токена, но запрос идет к защищенному API
      if (!isRedirecting) {
        isRedirecting = true;
        window.location.href = '/login';
      }
      return Promise.reject(new Error('No token'));
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Общий обработчик ошибок
const handleAuthError = (error) => {
  if (error.response?.status === 401 && !isRedirecting) {
    isRedirecting = true;
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  return Promise.reject(error);
};

// Добавляем интерсепторы для обоих экземпляров
api.interceptors.response.use(
  (response) => response,
  handleAuthError
);

api_protected.interceptors.response.use(
  (response) => response,
  handleAuthError
);

// API методы для авторизации
export const authAPI = {
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  register: (name, email, password) => {
    return api.post('/auth/register', { name, email, password });
  },
  
  verify: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;
      
      const response = await api_protected.get('/auth/verify');
      return response.status === 200;
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Verify error:', error);
      }
      return false;
    }
  },
  
  logout: () => {
    localStorage.removeItem('token');
    isRedirecting = false;
    return Promise.resolve();
  },
  
  // Получить текущий токен
  getToken: () => localStorage.getItem('token'),
  
  // Проверить, есть ли токен
  hasToken: () => !!localStorage.getItem('token')
};

export default api;
export { api_protected };