import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Admin.css';

const API_URL = '/api/admin';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  },
});

// Компонент для отображения и управления сущностями
const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('curators');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  // Конфигурация для каждой сущности
  const entityConfig = {
    curators: {
      title: 'Кураторы',
      fields: [
        { name: 'name', label: 'Имя', type: 'text' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'passwd', label: 'Пароль', type: 'password', required: false }
      ]
    },
    projects: {
      title: 'Проекты',
      fields: [
        { name: 'name', label: 'Название', type: 'text' },
        { name: 'description', label: 'Описание', type: 'textarea' },
        { name: 'curatorIds', label: 'ID Кураторов', type: 'text' },
        { name: 'startDate', label: 'Дата начала', type: 'date' },
        { name: 'endDate', label: 'Дата окончания', type: 'date' },
        { name: 'semester', label: 'Семестр', type: 'text' }
      ]
    },
    teams: {
      title: 'Команды',
      fields: [
        { name: 'name', label: 'Название', type: 'text' },
        { name: 'projectId', label: 'ID Проекта', type: 'number' },
        { name: 'callDay', label: 'День звонка', type: 'text' },
        { name: 'callTime', label: 'Время звонка', type: 'text' },
        { name: 'curators', label: 'ID Кураторов', type: 'text' }
      ]
    },
    members: {
      title: 'Участники',
      fields: [
        { name: 'name', label: 'Имя', type: 'text' },
        { name: 'surname', label: 'Фамилия', type: 'text' },
        { name: 'secondName', label: 'Отчество', type: 'text' },
        { name: 'teamId', label: 'ID Команды', type: 'number' }
      ]
    },
    profiles: {
      title: 'Профили',
      fields: [
        { name: 'role', label: 'Роль', type: 'text' },
        { name: 'stack', label: 'Стек', type: 'text' },
        { name: 'groupNumber', label: 'Номер группы', type: 'text' }
      ]
    },
    meetings: {
      title: 'Встречи',
      fields: [
        { name: 'date', label: 'Дата', type: 'date' },
        { name: 'time', label: 'Время', type: 'time' },
        { name: 'teamId', label: 'ID Команды', type: 'number' },
        { name: 'result', label: 'Результат', type: 'number' },
        { name: 'status', label: 'Статус', type: 'text' }
      ]
    },
    tasks: {
      title: 'Задачи',
      fields: [
        { name: 'name', label: 'Название', type: 'text' },
        { name: 'status', label: 'Статус', type: 'checkbox' },
        { name: 'startline', label: 'Дата начала', type: 'date' },
        { name: 'deadline', label: 'Дедлайн', type: 'date' }
      ]
    }
  };

  // Загрузка данных
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/${activeTab}`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Обработчики форм
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Преобразование данных для некоторых полей
    const submitData = { ...formData };
    if (activeTab === 'projects' && submitData.curatorIds) {
      submitData.curatorIds = submitData.curatorIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    }
    if (activeTab === 'teams' && submitData.curators) {
      submitData.curators = submitData.curators.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    }
    if (activeTab === 'meetings' && submitData.time) {
      // Преобразование времени в формат TimeOnly
      submitData.time = new Date(`1900-01-01T${submitData.time}`).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    try {
      if (editingItem) {
        await api.put(`/${activeTab.slice(0, -1)}/${editingItem.id}`, submitData);
        alert('Успешно обновлено!');
      } else {
        await api.post(`/${activeTab.slice(0, -1)}`, submitData);
        alert('Успешно создано!');
      }
      setShowForm(false);
      setEditingItem(null);
      setFormData({});
      fetchData();
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Ошибка сохранения: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData(item);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Вы уверены, что хотите удалить эту запись?')) return;
    
    try {
      await api.delete(`/${activeTab.slice(0, -1)}/${id}`);
      alert('Успешно удалено!');
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Ошибка удаления');
    }
  };

  const handleNew = () => {
    setEditingItem(null);
    setFormData({});
    setShowForm(true);
  };

  const currentConfig = entityConfig[activeTab];

  return (
    <div className="admin-panel">
      <h1>Панель администратора</h1>
      
      {/* Вкладки навигации */}
      <div className="admin-tabs">
        {Object.entries(entityConfig).map(([key, config]) => (
          <button
            key={key}
            className={`tab-button ${activeTab === key ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(key);
              setShowForm(false);
              setEditingItem(null);
            }}
          >
            {config.title}
          </button>
        ))}
      </div>

      {/* Кнопка создания */}
      <div className="admin-actions">
        <button className="btn-new" onClick={handleNew}>
          + Добавить {currentConfig.title.slice(0, -1).toLowerCase()}
        </button>
        <button className="btn-refresh" onClick={fetchData}>
          🔄 Обновить
        </button>
      </div>

      {/* Форма создания/редактирования */}
      {showForm && (
        <div className="admin-form-modal">
          <div className="form-content">
            <h2>{editingItem ? 'Редактирование' : 'Создание'} {currentConfig.title.toLowerCase()}</h2>
            <form onSubmit={handleSubmit}>
              {currentConfig.fields.map(field => (
                <div key={field.name} className="form-group">
                  <label htmlFor={field.name}>{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea
                      id={field.name}
                      name={field.name}
                      value={formData[field.name] || ''}
                      onChange={handleInputChange}
                      required={field.required !== false}
                      rows={4}
                    />
                  ) : field.type === 'checkbox' ? (
                    <input
                      type="checkbox"
                      id={field.name}
                      name={field.name}
                      checked={formData[field.name] || false}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <input
                      type={field.type}
                      id={field.name}
                      name={field.name}
                      value={formData[field.name] || ''}
                      onChange={handleInputChange}
                      required={field.required !== false}
                    />
                  )}
                </div>
              ))}
              <div className="form-actions">
                <button type="submit" className="btn-save">Сохранить</button>
                <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Таблица данных */}
      {!showForm && (
        <div className="data-table-container">
          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : data.length === 0 ? (
            <div className="no-data">Нет данных</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  {currentConfig.fields.map(field => (
                    <th key={field.name}>{field.label}</th>
                  ))}
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {data.map(item => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    {currentConfig.fields.map(field => (
                      <td key={field.name}>
                        {field.type === 'checkbox' 
                          ? (item[field.name] ? '✓' : '✗')
                          : Array.isArray(item[field.name])
                            ? item[field.name].join(', ')
                            : String(item[field.name] ?? '')}
                      </td>
                    ))}
                    <td className="actions">
                      <button 
                        className="btn-edit" 
                        onClick={() => handleEdit(item)}
                        title="Редактировать"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-delete" 
                        onClick={() => handleDelete(item.id)}
                        title="Удалить"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
