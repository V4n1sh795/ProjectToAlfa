// App.js
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useEffect, useState } from "react";
import Calender from "./pages/Calender";
import Finder from "./pages/Finder";
import StudentPage from "./pages/StudentPage";
import TeamPage from "./pages/TeamPage";
import CuratorPage from "./pages/CuratorPage";
import ProjectPage from "./pages/ProjectPage";
import Messenger from "./pages/Messenger";
import CreateCase from "./pages/CreateCase";
import CreateTeam from "./pages/CreateTeam";
import LogOut from "./pages/LogOut";
import LogIn from "./pages/LogIn";
import { authAPI } from "./pages/js/LogIn";
import "./App.css";

import calendarIcon from "./assets/icons/calendar.svg";
import searchIcon from "./assets/icons/finder.svg";
import chatsIcon from "./assets/icons/chats.svg";
import createCaseIcon from "./assets/icons/create_case.svg";
import createTeamIcon from "./assets/icons/create_team.svg";
import logoutIcon from "./assets/icons/logout.svg";

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
    { path: "/calender", label: "", icon: calendarIcon },
    { path: "/finder", label: "", icon: searchIcon },
    { path: "/messenger", label: "", icon: chatsIcon },
    { path: "/createcase", label: "", icon: createCaseIcon },
    { path: "/createteam", label: "", icon: createTeamIcon },
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname.startsWith(item.path) ? "active" : ""}`}
          >
            <img src={item.icon} alt="" className="nav-icon" />
          </Link>
        ))}
      </nav>

      <button onClick={onLogout} className="logout-button">
        <img src={logoutIcon} alt="" className="nav-icon" />
      </button>
    </aside>
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
      <div className={`app-container ${!isAuthenticated ? "auth-layout" : ""}`}>
        <header className="top-bar">
          <Link to="/calender" className="top-bar-logo">
            <h1 className="top-bar-title">BetaProject</h1>
          </Link>
        </header>

        <button
          className="menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          ☰
        </button>

        <Sidebar isAuthenticated={isAuthenticated} onLogout={handleLogout} />

        <main className={`main-content ${mobileMenuOpen ? "shifted" : ""}`}>
          <Routes>
            <Route
              path="/login"
              element={<LogIn setIsAuthenticated={setIsAuthenticated} />}
            />

            <Route
              path="/calender"
              element={
                <ProtectedRoute
                  isAuthenticated={isAuthenticated}
                  loading={loading}
                >
                  <Calender />
                </ProtectedRoute>
              }
            />

            <Route
              path="/finder"
              element={
                <ProtectedRoute
                  isAuthenticated={isAuthenticated}
                  loading={loading}
                >
                  <Finder />
                </ProtectedRoute>
              }
            />

            <Route
              path="/finder/student/:id"
              element={
                <ProtectedRoute
                  isAuthenticated={isAuthenticated}
                  loading={loading}
                >
                  <StudentPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/finder/team/:id"
              element={
                <ProtectedRoute
                  isAuthenticated={isAuthenticated}
                  loading={loading}
                >
                  <TeamPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/finder/curator/:id"
              element={
                <ProtectedRoute
                  isAuthenticated={isAuthenticated}
                  loading={loading}
                >
                  <CuratorPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/finder/project/:id"
              element={
                <ProtectedRoute
                  isAuthenticated={isAuthenticated}
                  loading={loading}
                >
                  <ProjectPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/messenger"
              element={
                <ProtectedRoute
                  isAuthenticated={isAuthenticated}
                  loading={loading}
                >
                  <Messenger />
                </ProtectedRoute>
              }
            />

            <Route
              path="/createcase"
              element={
                <ProtectedRoute
                  isAuthenticated={isAuthenticated}
                  loading={loading}
                >
                  <CreateCase />
                </ProtectedRoute>
              }
            />

            <Route
              path="/createteam"
              element={
                <ProtectedRoute
                  isAuthenticated={isAuthenticated}
                  loading={loading}
                >
                  <CreateTeam />
                </ProtectedRoute>
              }
            />

            <Route
              path="/logout"
              element={
                <ProtectedRoute
                  isAuthenticated={isAuthenticated}
                  loading={loading}
                >
                  <LogOut setIsAuthenticated={setIsAuthenticated} />
                </ProtectedRoute>
              }
            />

            {/* Корневой маршрут с умным редиректом */}
            <Route
              path="/"
              element={
                <RootRedirect
                  isAuthenticated={isAuthenticated}
                  loading={loading}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
