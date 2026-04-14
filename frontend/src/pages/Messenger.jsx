import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import './css/Messenger.css';

const Messenger = () => {
  const [projects, setProjects] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputText, setInputText] = useState('');
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Создаем axios инстанс один раз
  const api = useMemo(() => axios.create({
    baseURL: '/api',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
  }), []);

  // Мемоизируем пользователя
  const currentUser = useMemo(() => ({
    id: parseInt(localStorage.getItem('id') || '0'),
    name: localStorage.getItem('user_name') || 'User'
  }), []);

  // Скролл вниз
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Загрузка проектов
  useEffect(() => {
    fetchProjects();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/cproject/' + currentUser.id);
      setProjects(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Ошибка загрузки проектов');
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Загрузка сообщений с проверкой на дубликаты
  const fetchMessages = useCallback(async (chatId) => {
    try {
      const response = await api.get(`/message/${chatId}`);
      const newData = response.data;
      
      setMessages(prev => {
        // Не обновляем, если данные не изменились (предотвращает мигание)
        if (prev.length === newData.length && 
            prev.length > 0 && 
            prev[prev.length - 1].id === newData[newData.length - 1].id) {
          return prev;
        }
        return newData;
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching messages:', err);
      if (err.response?.status === 401) {
        setError('Сессия истекла, пожалуйста, войдите заново');
      }
    }
  }, [api]);

  // Поллинг сообщений
  useEffect(() => {
    if (!currentChatId) return;

    fetchMessages(currentChatId);
    const intervalId = setInterval(() => fetchMessages(currentChatId), 3000);

    return () => clearInterval(intervalId);
  }, [currentChatId, fetchMessages]);

  // Отправка сообщения
  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !currentChatId) return;

    const messageData = {
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_text: inputText
    };

    try {
      const response = await api.post(`/message/${currentChatId}`, messageData);
      const newMessage = response.data;
      
      setMessages(prev => {
        // Защита от дублей при быстром поллинге
        if (prev.some(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      
      setInputText('');
      setError(null);
      
      // Возвращаем фокус после рендера
      setTimeout(() => textareaRef.current?.focus(), 0);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.response?.data?.message || err.message || 'Ошибка отправки сообщения');
    }
  }, [inputText, currentChatId, currentUser, api]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const handleTextChange = useCallback((e) => {
    setInputText(e.target.value);
  }, []);

  return (
    <div className="messenger">
      <div className="messenger-header">
        <div className="logo">
          <span className="logo-icon">💬</span>
          <h1>Мессенджер</h1>
        </div>
        <div className="user-info">
          <div className="user-avatar">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <span className="user-name">{currentUser.name}</span>
            <span className="user-id">ID: {currentUser.id}</span>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="error-message">
          <span>⚠️</span> {error}
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}
      
      <div className="messenger-main">
        {/* Список чатов */}
        <div className="chat-list">
          <div className="chat-list-header">
            <h2>Проекты (Чаты)</h2>
          </div>
          <div className="chat-items">
            {projects.map(project => (
              <div
                key={project.id}
                className={`chat-item ${currentChatId === project.id ? 'active' : ''}`}
                onClick={() => {
                  setCurrentChatId(project.id);
                  setInputText('');
                }}
              >
                <div className="chat-name">{project.name}</div>
                <div className="chat-id">ID: {project.id}</div>
              </div>
            ))}
            {projects.length === 0 && !loading && (
              <div className="no-chats">Нет доступных чатов</div>
            )}
            {loading && projects.length === 0 && (
              <div className="loading-chats">Загрузка чатов...</div>
            )}
          </div>
        </div>

        {/* Окно чата */}
        <div className={`chat-window ${!currentChatId ? 'empty' : ''}`}>
          {!currentChatId ? (
            <div className="empty-chat">
              <div className="empty-icon">💬</div>
              <div className="empty-text">Выберите чат для начала общения</div>
            </div>
          ) : (
            <>
              <div className="chat-header">
                <div className="chat-info">
                  <h3>Чат проекта #{currentChatId}</h3>
                  <div className="participants-count">
                    {projects.find(p => p.id === currentChatId)?.name || 'Загрузка...'}
                  </div>
                </div>
              </div>
              
              <div className="messages-container">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message ${message.sender_id === currentUser.id ? 'own' : 'other'}`}
                  >
                    <div className="message-header">
                      <span className="sender-name">{message.sender_name}</span>
                      <span className="message-time">
                        {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                      </span>
                    </div>
                    <div className="message-text">{message.text}</div>
                  </div>
                ))}
                
                {messages.length === 0 && (
                  <div className="no-messages">
                    <div className="no-messages-icon">📭</div>
                    <div>Сообщений пока нет</div>
                    <div className="no-messages-hint">Напишите первое сообщение!</div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="message-input-container">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyPress}
                  placeholder="Введите сообщение... (Enter для отправки, Shift+Enter для новой строки)"
                  rows={1}
                />
                <button 
                  onClick={sendMessage} 
                  className="send-button"
                  disabled={!inputText.trim()}
                >
                  <span>📤</span> Отправить
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messenger;