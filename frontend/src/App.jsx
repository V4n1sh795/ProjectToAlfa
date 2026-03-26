// App.js
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Calender from './pages/Calender';
import Finder from './pages/Finder';
import Messenger from './pages/Messenger';
import CreateCase from './pages/CreateCase';
import CreateTeam from './pages/CreateTeam';
import LogOut from './pages/LogOut';
import LogIn from './pages/LogIn';
import { authAPI } from './pages/js/LogIn';
import './App.css';

// Компонент защищенного маршрута
const ProtectedRoute = ({ children, isAuthenticated, loading }) => {
  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Компонент для корневого маршрута
const RootRedirect = ({ isAuthenticated, loading }) => {
  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }
  
  // Если авторизован - перенаправляем на календарь
  if (isAuthenticated) {
    return <Navigate to="/calender" replace />;
  }
  
  // Если не авторизован - на страницу входа
  return <Navigate to="/login" replace />;
};

// Компонент бокового меню
const Sidebar = ({ isAuthenticated, onLogout }) => {
  const location = useLocation();
  
  if (!isAuthenticated) return null;
  
  const menuItems = [
    { path: "/calender", label: "Календарь", icon: "📅" },
    { path: "/finder", label: "Поиск", icon: "🔍" },
    { path: "/messenger", label: "Мессенджер", icon: "💬" },
    { path: "/createcase", label: "Создание кейса", icon: "📝" },
    { path: "/createteam", label: "Создание Команды", icon: "👥" }
  ];
  
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h2>Case Manager</h2>
        <p>Управление кейсами</p>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      
      <button onClick={onLogout} className="logout-button">
        <span className="nav-icon">🚪</span>
        <span>Выход</span>
      </button>
    </div>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
    setMobileMenuOpen(false);
  };
  
  return (
    <BrowserRouter>
      <div className="app-container">
        <button 
          className="menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          ☰
        </button>
        
        <Sidebar 
          isAuthenticated={isAuthenticated} 
          onLogout={handleLogout}
        />
        
        <div className={`main-content ${mobileMenuOpen ? 'shifted' : ''}`}>
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
            
            {/* Корневой маршрут с умным редиректом */}
            <Route 
              path="/" 
              element={
                <RootRedirect isAuthenticated={isAuthenticated} loading={loading} />
              } 
            />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;