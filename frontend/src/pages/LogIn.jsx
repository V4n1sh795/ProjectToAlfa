// pages/LogIn.js
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from './js/LogIn';
import './css/LogIn.css';

function LogIn({ setIsAuthenticated }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Очищаем ошибки при вводе
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    setServerError('');
  };

  const validateLogin = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email обязателен';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Введите корректный email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Пароль обязателен';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Пароль должен быть не менее 6 символов';
    }
    
    return newErrors;
  };

  const validateRegister = () => {
    const newErrors = {};
    if (!formData.name) {
      newErrors.name = 'Имя обязательно';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Имя должно быть не менее 2 символов';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email обязателен';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Введите корректный email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Пароль обязателен';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Пароль должен быть не менее 6 символов';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Подтвердите пароль';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    
    // Валидация
    const validationErrors = isLogin ? validateLogin() : validateRegister();
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (isLogin) {
        // Отправка запроса на вход
        const response = await authAPI.login(formData.email, formData.password);
        
        // console.log('Успешный вход:', response.data);
        
        // Сохраняем токен
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Обновляем состояние авторизации
        if (setIsAuthenticated) {
          setIsAuthenticated(true);
        }
        
        // Перенаправляем на главную страницу
        navigate('/calender');
      } else {
        // Отправка запроса на регистрацию
        const response = await authAPI.register(
          formData.name,
          formData.email,
          formData.password
        );
        
        // console.log('Успешная регистрация:', response.data);
        
        // Показываем сообщение об успехе
        alert('Регистрация успешна! Теперь войдите в аккаунт.');
        
        // Переключаемся на форму входа
        setIsLogin(true);
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          name: ''
        });
      }
    } catch (error) {
      console.error('Ошибка:', error);
      
      // Обработка ошибок от сервера
      if (error.response) {
        // Сервер вернул ошибку
        const serverErrorMessage = error.response.data.message || 'Произошла ошибка';
        setServerError(serverErrorMessage);
        
        // Если есть детальные ошибки валидации
        if (error.response.data.errors) {
          const newErrors = {};
          error.response.data.errors.forEach(err => {
            newErrors[err.field] = err.message;
          });
          setErrors(newErrors);
        }
      } else if (error.request) {
        // Запрос был отправлен, но ответ не получен
        setServerError('Сервер не отвечает. Проверьте подключение к интернету.');
      } else {
        // Ошибка при настройке запроса
        setServerError('Ошибка при отправке запроса. Попробуйте позже.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setServerError('');
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      name: ''
    });
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{isLogin ? 'Вход в аккаунт' : 'Создать аккаунт'}</h2>
          <p className="auth-subtitle">
            {isLogin ? 'Войдите, чтобы продолжить' : 'Зарегистрируйтесь, чтобы начать'}
          </p>
        </div>

        {serverError && (
          <div className="server-error">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Имя</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Введите ваше имя"
                className={errors.name ? 'error' : ''}
                disabled={isLoading}
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@mail.com"
              className={errors.email ? 'error' : ''}
              disabled={isLoading}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Введите пароль"
              className={errors.password ? 'error' : ''}
              disabled={isLoading}
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Подтверждение пароля</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Повторите пароль"
                className={errors.confirmPassword ? 'error' : ''}
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <span className="error-message">{errors.confirmPassword}</span>
              )}
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? (
              <span className="loader"></span>
            ) : isLogin ? (
              'Войти'
            ) : (
              'Зарегистрироваться'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
            <button
              type="button"
              onClick={toggleMode}
              className="toggle-btn"
              disabled={isLoading}
            >
              {isLogin ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LogIn;