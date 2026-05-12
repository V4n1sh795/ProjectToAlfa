import React, { useState, useEffect, useCallback } from 'react';
import './css/Search.css';

const Finder = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch data when filters or query change
  useEffect(() => {
    if (debouncedQuery || selectedEntities.length > 0) {
      fetchData();
    } else {
      setResults([]);
    }
  }, [debouncedQuery, selectedEntities, selectedPeriods]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    if (isModalOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const promises = [];
      
      const entityMap = {
        'student': 'member',
        'curator': 'curator',
        'team': 'team',
        'project': 'project',
        'project-idea': 'project',
        'project-pending': 'project',
        'project-active': 'project',
        'project-archive': 'project'
      };

      const uniqueEntities = [...new Set(selectedEntities.map(e => entityMap[e]))];

      if (uniqueEntities.length === 0) {
        uniqueEntities.push('project', 'team', 'member', 'curator');
      }

      uniqueEntities.forEach(entity => {
        const url = `api/find/${entity}?query=${encodeURIComponent(debouncedQuery)}`;
        promises.push(fetch(url).then(res => res.json()).then(data => ({ entity, data })));
      });

      const allResults = await Promise.all(promises);
      
      const formattedResults = allResults.flatMap(({ entity, data }) => 
        data.map(item => ({
          ...item,
          entityType: entity,
          period: selectedPeriods[0] || 'current'
        }))
      );

      setResults(formattedResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriods(prev => 
      prev.includes(period) 
        ? prev.filter(p => p !== period)
        : [...prev, period]
    );
  };

  const handleEntityChange = (entity) => {
    setSelectedEntities(prev => 
      prev.includes(entity) 
        ? prev.filter(e => e !== entity)
        : [...prev, entity]
    );
  };

  const resetFilters = () => {
    setSelectedPeriods([]);
    setSelectedEntities([]);
    setSearchQuery('');
    setResults([]);
  };

  const openEntityCard = useCallback((result) => {
    setSelectedResult(result);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedResult(null), 200);
  }, []);

  const getEntityIcon = (type) => {
    switch(type) {
      case 'project': return '📁';
      case 'team': return '👥';
      case 'member': return '👤';
      case 'curator': return '👨‍';
      default: return '📄';
    }
  };

  const getEntityLabel = (type) => {
    const labels = {
      'project': 'Проект',
      'team': 'Команда',
      'member': 'Студент',
      'curator': 'Куратор'
    };
    return labels[type] || type;
  };

  const getStatusColor = (status) => {
    const colors = {
      'idea': { bg: '#e3f2fd', text: '#1976d2' },
      'pending': { bg: '#fff3e0', text: '#f57c00' },
      'active': { bg: '#d4edda', text: '#155724' },
      'archive': { bg: '#f5f5f5', text: '#666' }
    };
    return colors[status] || colors.active;
  };

  const periods = [
    '2025/26 Весенний',
    '2025/26 Осенний',
    '2024/25 Весенний',
    '2024/25 Осенний'
  ];

  const entities = [
    { id: 'student', label: 'Студент' },
    { id: 'curator', label: 'Куратор' },
    { id: 'team', label: 'Команда' },
    { id: 'project-idea', label: 'Идея проекта' },
    { id: 'project-pending', label: 'Проект на согласовании' },
    { id: 'project-active', label: 'Проект в работе' },
    { id: 'project-archive', label: 'Проект в архиве' }
  ];

  // Entity detail renderer
// Entity detail renderer - отображает ВСЕ поля из моделей
    const renderEntityDetails = (entity) => {
    // Вспомогательная функция для безопасного отображения списков
    const renderList = (items, label = 'Элемент') => {
        if (!items || items.length === 0) return <span className="detail-value">—</span>;
        return (
        <ul className="detail-list">
            {items.map((item, idx) => (
            <li key={idx}>{typeof item === 'object' ? JSON.stringify(item) : item}</li>
            ))}
        </ul>
        );
    };

    // Вспомогательная функция для форматирования даты
    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        try {
        return new Date(dateStr).toLocaleDateString('ru-RU', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        } catch {
        return dateStr;
        }
    };

    switch(entity.entityType) {
        case 'project':
        return (
            <div className="entity-details">
            <div className="detail-section">
                <h4>Основная информация</h4>
                <div className="detail-row">
                <span className="detail-label">ID:</span>
                <span className="detail-value">#{entity.id}</span>
                </div>
                <div className="detail-row">
                <span className="detail-label">Название:</span>
                <span className="detail-value">{entity.name || 'Не указано'}</span>
                </div>
                <div className="detail-row">
                <span className="detail-label">Описание:</span>
                <p className="detail-value description">{entity.description || 'Не указано'}</p>
                </div>
            </div>

            <div className="detail-section">
                <h4>Период</h4>
                <div className="detail-row">
                <span className="detail-label">Семестр:</span>
                <span className="detail-value">{entity.semester || 'Не указан'}</span>
                </div>
                <div className="detail-row">
                <span className="detail-label">Начало:</span>
                <span className="detail-value">{formatDate(entity.startDate)}</span>
                </div>
                <div className="detail-row">
                <span className="detail-label">Окончание:</span>
                <span className="detail-value">{formatDate(entity.endDate)}</span>
                </div>
            </div>

            <div className="detail-section">
                <h4>Кураторы</h4>
                <div className="detail-row">
                <span className="detail-label">ID кураторов:</span>
                {renderList(entity.curatorIds || [], 'Куратор')}
                </div>
            </div>
            </div>
        );

        case 'team':
        return (
            <div className="entity-details">
            <div className="detail-section">
                <h4>Основная информация</h4>
                <div className="detail-row">
                <span className="detail-label">ID:</span>
                <span className="detail-value">#{entity.id}</span>
                </div>
                <div className="detail-row">
                <span className="detail-label">Название:</span>
                <span className="detail-value">{entity.name || 'Не указано'}</span>
                </div>
                <div className="detail-row">
                <span className="detail-label">Создана:</span>
                <span className="detail-value">{formatDate(entity.createdAt)}</span>
                </div>
            </div>

            <div className="detail-section">
                <h4>Привязка к проекту</h4>
                <div className="detail-row">
                <span className="detail-label">ID проекта:</span>
                <span className="detail-value">#{entity.projectId}</span>
                </div>
                {entity.projectName && (
                <div className="detail-row">
                    <span className="detail-label">Проект:</span>
                    <span className="detail-value">{entity.projectName}</span>
                </div>
                )}
            </div>

            <div className="detail-section">
                <h4>Контакты</h4>
                <div className="detail-row">
                <span className="detail-label">День созвона:</span>
                <span className="detail-value">{entity.callDay || 'Не указан'}</span>
                </div>
                <div className="detail-row">
                <span className="detail-label">Время созвона:</span>
                <span className="detail-value">{entity.callTime || 'Не указано'}</span>
                </div>
            </div>

            <div className="detail-section">
                <h4>Состав</h4>
                <div className="detail-row">
                <span className="detail-label">Участники:</span>
                {entity.members && entity.members.length > 0 ? (
                    <ul className="detail-list">
                    {entity.members.map((member, idx) => (
                        <li key={idx}>
                        {member.surname} {member.name} {member.secondName || ''}
                        {member.id && <span className="detail-meta"> (#{member.id})</span>}
                        </li>
                    ))}
                    </ul>
                ) : (
                    <span className="detail-value">—</span>
                )}
                </div>
                <div className="detail-row">
                <span className="detail-label">Кураторы (ID):</span>
                {renderList(entity.curators || [], 'Куратор')}
                </div>
            </div>

            <div className="detail-section">
                <h4>Дополнительно</h4>
                <div className="detail-row">
                <span className="detail-label">Комментарии:</span>
                {renderList(entity.comments || [], 'Комментарий')}
                </div>
                <div className="detail-row">
                <span className="detail-label">Задачи (ID):</span>
                {renderList(entity.tasks || [], 'Задача')}
                </div>
            </div>
            </div>
        );

        case 'member':
        return (
            <div className="entity-details">
            <div className="detail-section">
                <h4>Личные данные</h4>
                <div className="detail-row">
                <span className="detail-label">ID:</span>
                <span className="detail-value">#{entity.id}</span>
                </div>
                <div className="detail-row">
                <span className="detail-label">Фамилия:</span>
                <span className="detail-value">{entity.surname || '—'}</span>
                </div>
                <div className="detail-row">
                <span className="detail-label">Имя:</span>
                <span className="detail-value">{entity.name || '—'}</span>
                </div>
                <div className="detail-row">
                <span className="detail-label">Отчество:</span>
                <span className="detail-value">{entity.secondName || 'Не указано'}</span>
                </div>
            </div>

            <div className="detail-section">
                <h4>Контакты</h4>
                <div className="detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{entity.email || 'Не указан'}</span>
                </div>
            </div>

            <div className="detail-section">
                <h4>Команда</h4>
                <div className="detail-row">
                <span className="detail-label">ID команды:</span>
                <span className="detail-value">{entity.teamId ? `#${entity.teamId}` : 'Не назначен'}</span>
                </div>
                {entity.team && (
                <>
                    <div className="detail-row">
                    <span className="detail-label">Название команды:</span>
                    <span className="detail-value">{entity.team.name}</span>
                    </div>
                    <div className="detail-row">
                    <span className="detail-label">Проект команды:</span>
                    <span className="detail-value">#{entity.team.projectId}</span>
                    </div>
                </>
                )}
            </div>

            <div className="detail-section">
                <h4>Профили</h4>
                <div className="detail-row">
                <span className="detail-label">Количество:</span>
                <span className="detail-value">{entity.profiles?.length || 0}</span>
                </div>
                {entity.profiles && entity.profiles.length > 0 && (
                <div className="detail-row">
                    <span className="detail-label">Список:</span>
                    {renderList(entity.profiles, 'Профиль')}
                </div>
                )}
            </div>
            </div>
        );

        case 'curator':
        return (
            <div className="entity-details">
            <div className="detail-section">
                <h4>Основная информация</h4>
                <div className="detail-row">
                <span className="detail-label">ID:</span>
                <span className="detail-value">#{entity.id}</span>
                </div>
                <div className="detail-row">
                <span className="detail-label">Имя:</span>
                <span className="detail-value">{entity.name || 'Не указано'}</span>
                </div>
            </div>

            <div className="detail-section">
                <h4>Контакты</h4>
                <div className="detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{entity.email || 'Не указан'}</span>
                </div>
            </div>

            {/* ⚠️ Пароль НЕ отображаем в целях безопасности */}
            <div className="detail-section">
                <h4>Примечание</h4>
                <p className="detail-note">
                ⚠️ Пароль не отображается в целях безопасности. 
                Для смены пароля используйте отдельную форму управления.
                </p>
            </div>
            </div>
        );

        default:
        return (
            <div className="entity-details">
            <p className="detail-value">Детали для типа "{entity.entityType}" не настроены.</p>
            <details>
                <summary>Показать все данные (JSON)</summary>
                <pre className="debug-json">{JSON.stringify(entity, null, 2)}</pre>
            </details>
            </div>
        );
    }
    };

  return (
    <div className="search-container">
      {/* Search Input */}
      <div className="search-input-wrapper">
        <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder=""
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Filters */}
      <div className="filters-wrapper">
        <div className="filter-section">
          <div className="filter-header">
            <span>Период</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          <div className="filter-options">
            {periods.map(period => (
              <label key={period} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedPeriods.includes(period)}
                  onChange={() => handlePeriodChange(period)}
                />
                <span className="checkmark"></span>
                {period}
              </label>
            ))}
            <label className="checkbox-label">
              <input type="checkbox" />
              <span className="checkmark"></span>
              ......
            </label>
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-header">
            <span>Сущность</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          <div className="filter-options">
            {entities.map(entity => (
              <label key={entity.id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedEntities.includes(entity.id)}
                  onChange={() => handleEntityChange(entity.id)}
                />
                <span className="checkmark"></span>
                {entity.label}
              </label>
            ))}
          </div>
        </div>

        <button className="reset-filters-btn" onClick={resetFilters}>
          Сбросить фильтры
        </button>
      </div>

      {/* Results */}
      {loading && <div className="loading">Загрузка...</div>}
      
      <div className="results-container">
        {results.map((result, index) => {
          const status = result.status || (result.entityType === 'project' ? 'active' : null);
          const statusStyle = status ? getStatusColor(status) : null;
          
          return (
            <div 
              key={index} 
              className="result-card clickable"
              onClick={() => openEntityCard(result)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && openEntityCard(result)}
            >
              {status && (
                <div className="result-status">
                  <span 
                    className="status-badge" 
                    style={{ background: statusStyle.bg, color: statusStyle.text }}
                  >
                    {status === 'active' ? 'В работе' : 
                     status === 'pending' ? 'На согласовании' :
                     status === 'idea' ? 'Идея' : 'В архиве'}
                  </span>
                </div>
              )}
              <div className="result-icon">
                {getEntityIcon(result.entityType)}
              </div>
              <div className="result-content">
                <h3>
                  {result.name || result.surname || result.title || 'Без названия'}
                  {result.entityType === 'member' && result.secondName && (
                    <span className="name-secondary"> {result.secondName}</span>
                  )}
                </h3>
                {result.description && (
                  <p className="result-description">{result.description}</p>
                )}
                {result.email && <p className="result-meta">📧 {result.email}</p>}
                {result.group && <p className="result-meta">🎓 {result.group}</p>}
                <span className="result-type">{getEntityLabel(result.entityType)}</span>
              </div>
              <svg className="chevron-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          );
        })}
      </div>

      {/* Entity Detail Modal */}
      {isModalOpen && selectedResult && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal} aria-label="Закрыть">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            
            <div className="modal-header">
              <div className="modal-icon">
                {getEntityIcon(selectedResult.entityType)}
              </div>
              <div>
                <h2 className="modal-title">
                  {selectedResult.name || selectedResult.surname || 'Без названия'}
                  {selectedResult.entityType === 'member' && selectedResult.secondName && (
                    <span className="name-secondary"> {selectedResult.secondName}</span>
                  )}
                </h2>
                <span className="modal-type">{getEntityLabel(selectedResult.entityType)}</span>
              </div>
            </div>

            <div className="modal-body">
              {renderEntityDetails(selectedResult)}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>
                Закрыть
              </button>
              <button className="btn-primary">
                Редактировать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finder;