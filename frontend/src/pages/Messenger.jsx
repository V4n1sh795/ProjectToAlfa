import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './css/Messenger.css';
import sendMessageIcon from '../assets/icons/send_message.svg';

const formatMessageTime = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const Messenger = () => {
  const [projects, setProjects] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [scrollbarState, setScrollbarState] = useState({ visible: false, top: 10 });
  const navigate = useNavigate();
  
  const messagesContainerRef = useRef(null);
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

  const updateScrollbar = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const trackPadding = 10;
    const thumbHeight = 60;
    const trackHeight = container.clientHeight - trackPadding * 2;
    const maxScroll = container.scrollHeight - container.clientHeight;

    if (maxScroll <= 0 || trackHeight <= thumbHeight) {
      setScrollbarState({ visible: false, top: trackPadding });
      return;
    }

    const maxThumbTop = trackHeight - thumbHeight;
    const top = (container.scrollTop / maxScroll) * maxThumbTop;

    setScrollbarState({ visible: true, top });
  }, []);

  useEffect(() => {
    scrollToBottom();
    requestAnimationFrame(updateScrollbar);
  }, [messages, scrollToBottom, updateScrollbar]);

  useEffect(() => {
    updateScrollbar();
    window.addEventListener('resize', updateScrollbar);

    return () => window.removeEventListener('resize', updateScrollbar);
  }, [currentChatId, updateScrollbar]);

  // Загрузка проектов
  useEffect(() => {
    fetchProjects();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentChatId || projects.length === 0) return;

    const preferredProject = projects.find(project =>
      project.name?.toLowerCase().includes('агента поддержки')
    );

    setCurrentChatId((preferredProject || projects[1] || projects[0]).id);
  }, [projects, currentChatId]);

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
  }, [api, currentUser.id]);

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

  const handleOpenProject = useCallback((event, projectId) => {
    event.stopPropagation();
    navigate(`/finder/project/${projectId}`);
  }, [navigate]);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) return projects;

    return projects.filter(project =>
      (project.name || '').toLowerCase().includes(normalizedQuery)
    );
  }, [projects, searchQuery]);

  return (
    <div className="messenger">
      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}
      
      <div className="messenger-main">
        {/* Список чатов */}
        <div className="chat-list">
          <div className="chat-search">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Поиск"
              aria-label="Поиск по чатам"
            />
          </div>
          <div className="chat-items">
            {filteredProjects.map(project => (
              <div
                key={project.id}
                className={`chat-item ${currentChatId === project.id ? 'active' : ''}`}
                onClick={() => {
                  setCurrentChatId(project.id);
                  setInputText('');
                }}
              >
                <div className="chat-name">{project.name}</div>
                {currentChatId === project.id && (
                  <button
                    type="button"
                    className="chat-card-button"
                    onClick={(event) => handleOpenProject(event, project.id)}
                  >
                    Открыть карточку
                  </button>
                )}
              </div>
            ))}
            {filteredProjects.length === 0 && !loading && (
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
              <div className="empty-text">Выберите чат для начала общения</div>
            </div>
          ) : (
            <>
              <div
                className="messages-container"
                ref={messagesContainerRef}
                onScroll={updateScrollbar}
              >
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message ${message.sender_id === currentUser.id ? 'own' : 'other'}`}
                  >
                    <div className="message-bubble">
                      <span className="message-text">{message.text}</span>
                      <span className="message-time">
                        {formatMessageTime(message.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
                
                {messages.length === 0 && (
                  <div className="no-messages">
                    <div>Сообщений пока нет</div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              {scrollbarState.visible && (
                <div className="chat-scrollbar" aria-hidden="true">
                  <div
                    className="chat-scrollbar-thumb"
                    style={{ transform: `translateY(${scrollbarState.top}px)` }}
                  />
                </div>
              )}
              
              <div className="message-input-container">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyPress}
                  placeholder="Введите сообщение..."
                  rows={1}
                />
                <button 
                  onClick={sendMessage} 
                  className="send-button"
                  disabled={!inputText.trim()}
                  aria-label="Отправить сообщение"
                >
                  <img src={sendMessageIcon} alt="" />
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
