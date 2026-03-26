// App.js
import { BrowserRouter, Routes, Route, Link, Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Calender from './pages/Calender';
import Finder from './pages/Finder';
import Messenger from './pages/Messenger';
import CreateCase from './pages/CreateCase';
import CreateTeam from './pages/CreateTeam';
import LogOut from './pages/LogOut';
import LogIn from './pages/LogIn';
import { authAPI } from './pages/js/LogIn'; // Исправленный импорт

// Компонент защищенного маршрута
const ProtectedRoute = ({ children, isAuthenticated, loading }) => {
  if (loading) {
    return <div>Loading...</div>; // Или ваш спиннер
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Компонент навигации
const Navigation = ({ isAuthenticated, onLogout }) => {
  if (!isAuthenticated) return null;
  
  return (
    <nav style={{ padding: '10px', backgroundColor: '#f0f0f0' }}>
      <Link to="/calender">Календарь</Link>
      <span style={{ margin: '0 10px' }}>|</span>
      <Link to="/finder">Поиск</Link>
      <span style={{ margin: '0 10px' }}>|</span>
      <Link to="/messenger">Мессенджер</Link>
      <span style={{ margin: '0 10px' }}>|</span>
      <Link to="/createcase">Создание кейса</Link>
      <span style={{ margin: '0 10px' }}>|</span>
      <Link to="/createteam">Создание Команды</Link>
      <span style={{ margin: '0 10px' }}>|</span>
      <button 
        onClick={onLogout}
        style={{ 
          background: 'none', 
          border: 'none', 
          color: 'blue', 
          cursor: 'pointer',
          textDecoration: 'underline'
        }}
      >
        Выход
      </button>
    </nav>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Проверка авторизации при загрузке приложения
  useEffect(() => {
    const checkAuth = async () => {
      const isValid = await authAPI.verify();
      setIsAuthenticated(isValid);
      setLoading(false);
    };
    
    checkAuth();
  }, []);
  
  // Функция выхода
  const handleLogout = () => {
    authAPI.logout();
    setIsAuthenticated(false);
  };
  
  return (
    <BrowserRouter>
      <Navigation 
        isAuthenticated={isAuthenticated} 
        onLogout={handleLogout} 
      />
      
      <Routes>
        <Route 
          path="/login" 
          element={
            <LogIn setIsAuthenticated={setIsAuthenticated} />
          } 
        />
        
        <Route 
          path="/calender" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
              <Calender />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/finder" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
              <Finder />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/messenger" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
              <Messenger />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/createcase" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
              <CreateCase />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/createteam" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
              <CreateTeam />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/logout" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
              <LogOut setIsAuthenticated={setIsAuthenticated} />
            </ProtectedRoute>
          } 
        />
        
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;