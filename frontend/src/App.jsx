// App.js
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import Calender from "./pages/Calender";
import Finder from "./pages/Finder";
import StudentPage from "./pages/StudentPage";
import TeamPage from "./pages/TeamPage";
import CuratorPage from "./pages/CuratorPage";
import ProjectPage from "./pages/ProjectPage";
import Messenger from "./pages/Messenger";
import CreateCase from "./pages/CreateCase";
import CreateTeam from "./pages/CreateTeam";
import TelegramBotPage from "./pages/TelegramBotPage";
import TeamWorkspaceScrollbar from "./components/TeamWorkspaceScrollbar";
import StatisticsPage from "./pages/StatisticsPage";
import LogOut from "./pages/LogOut";
import LogIn from "./pages/LogIn";
import { authAPI } from "./pages/js/LogIn";
import "./App.css";
import "./pages/css/TeamWorkspace.css";

import calendarIcon from "./assets/icons/calendar.svg";
import searchIcon from "./assets/icons/finder.svg";
import chatsIcon from "./assets/icons/chats.svg";
import createCaseIcon from "./assets/icons/create_case.svg";
import createTeamIcon from "./assets/icons/create_team.svg";
import statisticsIcon from "./assets/icons/statistics.svg";
import logoutIcon from "./assets/icons/logout.svg";
import botIcon from "./assets/telegram-bot/bot.svg";
import workspaceCalendarIcon from "./assets/telegram-bot/calendar.svg";
import workspaceDataIcon from "./assets/telegram-bot/data.svg";
import workspaceMessagesIcon from "./assets/telegram-bot/messages.svg";
import workspaceCreateIcon from "./assets/telegram-bot/create.svg";
import workspaceAddTeamIcon from "./assets/telegram-bot/add-team.svg";
import workspaceStatisticsIcon from "./assets/telegram-bot/statistics.svg";
import workspaceLogoutIcon from "./assets/telegram-bot/logout.svg";
import activeBotIcon from "./assets/telegram-bot/active-bot.svg";
import activeAddTeamIcon from "./assets/telegram-bot/active-add-team.svg";
import activeDataIcon from "./assets/telegram-bot/active-data.svg";

const menuItems = [
  { path: "/calender", label: "Календарь", icon: calendarIcon, workspaceIcon: workspaceCalendarIcon },
  { path: "/finder", label: "Данные", icon: searchIcon, workspaceIcon: workspaceDataIcon, activeIcon: activeDataIcon },
  { path: "/messenger", label: "Сообщения", icon: chatsIcon, workspaceIcon: workspaceMessagesIcon },
  { path: "/createcase", label: "Создать проект", icon: createCaseIcon, workspaceIcon: workspaceCreateIcon },
  { path: "/createteam", label: "Создать команду", icon: createTeamIcon, workspaceIcon: workspaceAddTeamIcon, activeIcon: activeAddTeamIcon },
  { path: "/statistics", label: "Статистика", icon: statisticsIcon, workspaceIcon: workspaceStatisticsIcon },
  { path: "/telegram-bot", label: "Управление Telegram-ботом", icon: botIcon, workspaceIcon: botIcon, activeIcon: activeBotIcon },
];

function getTeamWorkspace(pathname) {
  if (pathname === "/createteam" || /^\/telegram-bot\/team\/[^/]+\/(schedule|edit)\/?$/.test(pathname)) {
    return { page: "create", activePath: "/createteam" };
  }
  if (pathname.startsWith("/finder/team/") || /^\/telegram-bot\/team\/[^/]+\/?$/.test(pathname)) {
    return { page: "details", activePath: "/finder" };
  }
  if (pathname.startsWith("/telegram-bot")) {
    return { page: "management", activePath: "/telegram-bot" };
  }
  return null;
}

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
const Sidebar = ({ isAuthenticated, onLogout, isOpen, workspace }) => {
  const location = useLocation();

  if (!isAuthenticated) return null;

  return (
    <aside id="sidebar" className={`sidebar${isOpen ? " open" : ""}`}>
      <nav className="sidebar-nav" aria-label="Разделы">
        {menuItems.map((item) => {
          const active = workspace
            ? workspace.activePath === item.path
            : location.pathname.startsWith(item.path);
          const activeIcon = workspace && active ? item.activeIcon : undefined;
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={`nav-item${active ? " active" : ""}${activeIcon ? " nav-item--active-art" : ""}`}
            >
              <img
                src={activeIcon || (workspace ? item.workspaceIcon : item.icon)}
                alt=""
                className="nav-icon"
              />
            </Link>
          );
        })}
      </nav>

      <button type="button" onClick={onLogout} className="logout-button" aria-label="Выйти">
        <img src={workspace ? workspaceLogoutIcon : logoutIcon} alt="" className="nav-icon" />
      </button>
    </aside>
  );
};

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const workspace = isAuthenticated ? getTeamWorkspace(pathname) : null;
  const mainRef = useRef(null);

  useEffect(() => {
    setMobileMenuOpen(false);
    if (getTeamWorkspace(pathname)) mainRef.current?.scrollTo?.(0, 0);
  }, [pathname]);

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
      <div className={[
        "app-container",
        !isAuthenticated && "auth-layout",
        workspace && `team-workspace team-workspace--${workspace.page}`,
      ].filter(Boolean).join(" ")}>
        <header className="top-bar">
          <Link to="/calender" className="top-bar-logo">
            <h1 className="top-bar-title">BetaProject</h1>
          </Link>
        </header>

        <button
          type="button"
          className="menu-toggle"
          aria-label="Меню"
          aria-controls="sidebar"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          ☰
        </button>

        <Sidebar
          isAuthenticated={isAuthenticated}
          onLogout={handleLogout}
          isOpen={mobileMenuOpen}
          workspace={workspace}
        />

        <main
          ref={mainRef}
          tabIndex={workspace ? 0 : undefined}
          className={`main-content ${mobileMenuOpen ? "shifted" : ""}`}
        >
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
              path="/statistics"
              element={
                <ProtectedRoute
                  isAuthenticated={isAuthenticated}
                  loading={loading}
                >
                  <StatisticsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/telegram-bot/*"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                  <TelegramBotPage />
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
        {workspace && <TeamWorkspaceScrollbar scrollContainer={mainRef} pathname={pathname} />}
      </div>
  );
}

export default function App() {
  return <BrowserRouter><AppContent /></BrowserRouter>;
}
