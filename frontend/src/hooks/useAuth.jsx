// hooks/useAuth.js
import { useState, useEffect, useCallback } from 'react';
import { authAPI } from '../pages/js/LogIn';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const checkAuth = useCallback(async () => {
    const isValid = await authAPI.verify();
    if (isValid) {
      // Можно получить данные пользователя из localStorage или отдельного запроса
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } else {
      setUser(null);
    }
    setLoading(false);
    return isValid;
  }, []);
  
  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
      }
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  };
  
  const logout = () => {
    authAPI.logout();
    localStorage.removeItem('user');
    setUser(null);
  };
  
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  return { user, loading, login, logout, checkAuth };
};