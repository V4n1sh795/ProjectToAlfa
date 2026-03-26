// Эта залупа пока не работает потом допилю
import React, { useState, useEffect, useRef } from 'react';
import './css/Messenger.css';

const Messenger = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [activeChat, setActiveChat] = useState(0);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Данные для чатов
  const [chats, setChats] = useState([
    {
      id: 0,
      name: 'Алексей Иванов',
      avatar: 'https://via.placeholder.com/50/4CAF50/ffffff?text=АИ',
      lastMessage: 'Привет! Как дела?',
      time: '12:30',
      online: true,
      unread: 2,
      messages: [
        { id: 1, text: 'Привет! Как дела?', sender: 'other', time: '12:30', read: true },
        { id: 2, text: 'Отлично! А у тебя?', sender: 'me', time: '12:31', read: true },
        { id: 3, text: 'Тоже хорошо. Как проект?', sender: 'other', time: '12:32', read: false },
      ]
    },
    {
      id: 1,
      name: 'Мария Смирнова',
      avatar: 'https://via.placeholder.com/50/FF9800/ffffff?text=МС',
      lastMessage: 'Скинь фото, пожалуйста',
      time: '10:15',
      online: false,
      unread: 0,
      messages: [
        { id: 1, text: 'Привет!', sender: 'me', time: '10:00', read: true },
        { id: 2, text: 'Скинь фото, пожалуйста', sender: 'other', time: '10:15', read: true },
      ]
    },
    {
      id: 2,
      name: 'Дмитрий Петров',
      avatar: 'https://via.placeholder.com/50/2196F3/ffffff?text=ДП',
      lastMessage: 'Встреча в 15:00',
      time: '09:45',
      online: true,
      unread: 0,
      messages: [
        { id: 1, text: 'Доброе утро!', sender: 'other', time: '09:30', read: true },
        { id: 2, text: 'Встреча в 15:00', sender: 'other', time: '09:45', read: true },
      ]
    }
  ]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (inputMessage.trim() === '') return;

    const newMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };

    const updatedChats = [...chats];
    updatedChats[activeChat].messages.push(newMessage);
    updatedChats[activeChat].lastMessage = inputMessage;
    updatedChats[activeChat].time = newMessage.time;
    
    setChats(updatedChats);
    setInputMessage('');

    setTimeout(() => {
      simulateReply(updatedChats[activeChat].name);
    }, 1000);
  };

  const simulateReply = (chatName) => {
    const replies = [
      'Понял, спасибо!',
      'Отлично!',
      'Хорошо, договорились',
      'Скоро отвечу',
      '👍',
      'Да, конечно'
    ];
    
    const randomReply = replies[Math.floor(Math.random() * replies.length)];
    
    const replyMessage = {
      id: Date.now(),
      text: randomReply,
      sender: 'other',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };

    const updatedChats = [...chats];
    updatedChats[activeChat].messages.push(replyMessage);
    updatedChats[activeChat].lastMessage = randomReply;
    updatedChats[activeChat].time = replyMessage.time;
    
    setChats(updatedChats);
  };

  const sendFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileMessage = {
        id: Date.now(),
        text: `📎 Файл: ${file.name}`,
        sender: 'me',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false,
        isFile: true
      };

      const updatedChats = [...chats];
      updatedChats[activeChat].messages.push(fileMessage);
      updatedChats[activeChat].lastMessage = `Файл: ${file.name}`;
      updatedChats[activeChat].time = fileMessage.time;
      
      setChats(updatedChats);
    }
  };

  const addEmoji = (emoji) => {
    setInputMessage(inputMessage + emoji);
  };

  const changeChat = (index) => {
    setActiveChat(index);
    
    const updatedChats = [...chats];
    updatedChats[index].unread = 0;
    updatedChats[index].messages.forEach(msg => {
      if (!msg.read && msg.sender === 'other') {
        msg.read = true;
      }
    });
    setChats(updatedChats);
  };

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  const currentChat = chats[activeChat];
  const emojis = ['😀', '😂', '😍', '👍', '❤️', '🎉', '🔥', '😎', '🥳', '🤔'];

  return (
    <div className={`messenger-app ${isDarkTheme ? 'dark' : ''}`}>
      <div className="messenger-container">
        {/* Боковая панель */}
        <div className="messenger-sidebar">
          <div className="messenger-sidebar-header">
            <div className="messenger-user-info">
              <img 
                src="https://via.placeholder.com/40/4CAF50/ffffff?text=ME" 
                alt="User" 
                className="messenger-user-avatar"
              />
              <div className="messenger-user-details">
                <h3>Мой профиль</h3>
                <span className="messenger-status online">Онлайн</span>
              </div>
            </div>
            <div className="messenger-sidebar-actions">
              <button className="messenger-icon-button" onClick={toggleTheme}>
                {isDarkTheme ? '☀️' : '🌙'}
              </button>
              <button className="messenger-icon-button">⚙️</button>
            </div>
          </div>
          
          <div className="messenger-search-bar">
            <input 
              type="text" 
              placeholder="Поиск чатов..." 
              className="messenger-search-input"
            />
            <span className="messenger-search-icon">🔍</span>
          </div>
          
          <div className="messenger-chats-list">
            {chats.map((chat, index) => (
              <div 
                key={chat.id} 
                className={`messenger-chat-item ${activeChat === index ? 'active' : ''}`}
                onClick={() => changeChat(index)}
              >
                <div className="messenger-chat-avatar">
                  <img 
                    src={chat.avatar} 
                    alt={chat.name} 
                    className="messenger-chat-avatar-img"
                  />
                  {chat.online && <div className="messenger-online-dot"></div>}
                </div>
                <div className="messenger-chat-info">
                  <div className="messenger-chat-name">
                    <h4>{chat.name}</h4>
                    <span className="messenger-chat-time">{chat.time}</span>
                  </div>
                  <div className="messenger-chat-last-message">
                    <p>{chat.lastMessage}</p>
                    {chat.unread > 0 && <span className="messenger-unread-badge">{chat.unread}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Область чата */}
        <div className="messenger-chat-area">
          <div className="messenger-chat-header">
            <div className="messenger-chat-header-info">
              <img 
                src={currentChat.avatar} 
                alt={currentChat.name} 
                className="messenger-chat-header-avatar"
              />
              <div>
                <h3>{currentChat.name}</h3>
                <span className={`messenger-status ${currentChat.online ? 'online' : 'offline'}`}>
                  {currentChat.online ? 'Онлайн' : 'Был(а) недавно'}
                </span>
              </div>
            </div>
            <div className="messenger-chat-header-actions">
              <button className="messenger-icon-button">📞</button>
              <button className="messenger-icon-button">📹</button>
              <button className="messenger-icon-button">ℹ️</button>
            </div>
          </div>

          <div className="messenger-messages-area">
            {currentChat.messages.map((message) => (
              <div 
                key={message.id} 
                className={`messenger-message ${message.sender === 'me' ? 'sent' : 'received'}`}
              >
                {message.sender === 'other' && (
                  <img 
                    src={currentChat.avatar} 
                    alt="" 
                    className="messenger-message-avatar"
                  />
                )}
                <div className="messenger-message-content">
                  <div className="messenger-message-text">
                    {message.text}
                    {message.isFile && <span className="messenger-file-icon">📎</span>}
                  </div>
                  <div className="messenger-message-info">
                    <span className="messenger-message-time">{message.time}</span>
                    {message.sender === 'me' && (
                      <span className="messenger-message-status">
                        {message.read ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="messenger-input-area">
            <div className="messenger-emoji-picker">
              {emojis.map(emoji => (
                <button 
                  key={emoji} 
                  onClick={() => addEmoji(emoji)} 
                  className="messenger-emoji-btn"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <form onSubmit={sendMessage} className="messenger-input-form">
              <button 
                type="button" 
                className="messenger-attach-btn" 
                onClick={() => fileInputRef.current.click()}
              >
                📎
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={sendFile}
              />
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Введите сообщение..."
                className="messenger-message-input"
              />
              <button 
                type="button" 
                className="messenger-emoji-btn" 
                onClick={() => addEmoji('😊')}
              >
                😊
              </button>
              <button type="submit" className="messenger-send-btn">
                ➤
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messenger;