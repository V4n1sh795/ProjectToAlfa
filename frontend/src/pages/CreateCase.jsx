import axios from 'axios';
import React, { useState, useEffect } from 'react';
import './css/CreateCase.css';

const CreateCase = () => {
  // Функция для получения начальных значений на основе текущего времени
  const getInitialSemesterAndDates = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth() возвращает 0-11
    
    // Определяем текущий семестр
    let initialSemester = 'spring';
    let initialStartDate = '';
    let initialEndDate = '';
    
    if (currentMonth >= 9 && currentMonth <= 12) {
      // Сентябрь-Декабрь - осенний семестр
      initialSemester = 'autumn';
      initialStartDate = `01.09.${currentYear}`;
      initialEndDate = `31.12.${currentYear}`;
    } else {
      // Январь-Август - весенний семестр
      initialSemester = 'spring';
      initialStartDate = `01.02.${currentYear}`;
      initialEndDate = `30.06.${currentYear}`;
    }
    
    return {
      semester: initialSemester,
      startDate: initialStartDate,
      endDate: initialEndDate
    };
  };

  const initialData = getInitialSemesterAndDates();

  // Состояния для полей формы
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [roles, setRoles] = useState('');
  const [keyTechnology, setKeyTechnology] = useState('');
  const [projectGoal, setProjectGoal] = useState('');
  const [projectResult, setProjectResult] = useState('');
  const [startDate, setStartDate] = useState(initialData.startDate);
  const [endDate, setEndDate] = useState(initialData.endDate);
  const [semester, setSemester] = useState(initialData.semester);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const api = axios.create({
    baseURL: '/api',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
  });

  // Эффект для автоматической смены дат при изменении семестра
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    
    if (semester === 'autumn') {
      // Осенний семестр: 01.09.currentYear - 31.12.currentYear
      setStartDate(`01.09.${currentYear}`);
      setEndDate(`31.12.${currentYear}`);
    } else {
      // Весенний семестр: 01.02.currentYear - 30.06.currentYear
      setStartDate(`01.02.${currentYear}`);
      setEndDate(`30.06.${currentYear}`);
    }
  }, [semester]);

  // ИИ-заполнение (заглушка)
  const handleAIFill = () => {
    alert('Функция ИИ-заполнения будет доступна скоро');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Формируем объект проекта
    const projectData = {
      name: projectName,
      description,
      Main_Goal: projectGoal,
      Results: projectResult,
      Roles: roles,
      Technology: keyTechnology,
      startDate,
      endDate,
      semester: semester === 'autumn' ? 'Осенний' : 'Весенний'
    };
    
    console.log('Данные проекта:', projectData);
    
    try {
      const response = await api.post("/project", projectData);
      console.log(response);
      
      if (response.status === 200 || response.status === 201) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
        resetForm();
      }
    } catch (error) {
      console.error("Error creating project:", error);
      alert('Ошибка при создании проекта: ' + (error.response?.data?.message || error.message));
    }
  };

  const resetForm = () => {
    const initialData = getInitialSemesterAndDates();
    setProjectName('');
    setDescription('');
    setRoles('');
    setKeyTechnology('');
    setProjectGoal('');
    setProjectResult('');
    setStartDate(initialData.startDate);
    setEndDate(initialData.endDate);
    setSemester(initialData.semester);
  };

  return (
    <div className="create-project-container">
      <h2>Создание нового проекта</h2>
      
      {showSuccess && (
        <div className="success-message">
          <div className="success-icon">✓</div>
          <div className="success-text">
            <h3>Успешно</h3>
            <p>Проект создан.<br/>Вы можете обсудить его в чате или вернуться к списку проектов.</p>
          </div>
          <button className="close-success" onClick={() => setShowSuccess(false)}>×</button>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* Левая колонка */}
          <div className="form-column">
            {/* Название проекта */}
            <div className="form-group">
              <label htmlFor="projectName">Название проекта *</label>
              <input
                type="text"
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                placeholder="Введите название проекта"
              />
            </div>

            {/* Описание проекта */}
            <div className="form-group">
              <label htmlFor="description">Описание проекта *</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows="4"
                placeholder="Опишите проект"
              />
            </div>

            {/* Цель проекта */}
            <div className="form-group">
              <label htmlFor="projectGoal">Цель проекта *</label>
              <textarea
                id="projectGoal"
                value={projectGoal}
                onChange={(e) => setProjectGoal(e.target.value)}
                required
                rows="3"
                placeholder="Напишите цель проекта"
              />
            </div>

            {/* Результат проекта */}
            <div className="form-group">
              <label htmlFor="projectResult">Результат проекта *</label>
              <textarea
                id="projectResult"
                value={projectResult}
                onChange={(e) => setProjectResult(e.target.value)}
                required
                rows="3"
                placeholder="Напишите, какой результат должен быть достигнут"
              />
            </div>
          </div>

          {/* Правая колонка */}
          <div className="form-column">
            {/* Роли в проекте */}
            <div className="form-group">
              <label htmlFor="roles">Роли в проекте *</label>
              <input
                type="text"
                id="roles"
                value={roles}
                onChange={(e) => setRoles(e.target.value)}
                required
                placeholder="Укажите необходимые роли"
              />
            </div>

            {/* Ключевая технология */}
            <div className="form-group">
              <label htmlFor="keyTechnology">Ключевая технология *</label>
              <input
                type="text"
                id="keyTechnology"
                value={keyTechnology}
                onChange={(e) => setKeyTechnology(e.target.value)}
                required
                placeholder="Укажите ключевую технологию"
              />
            </div>

            {/* Семестр и даты */}
            <div className="form-row-dates">
              <div className="form-group">
                <label>Семестр *</label>
                <div className="semester-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="autumn"
                      checked={semester === 'autumn'}
                      onChange={(e) => setSemester(e.target.value)}
                    />
                    Осенний
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="spring"
                      checked={semester === 'spring'}
                      onChange={(e) => setSemester(e.target.value)}
                    />
                    Весенний
                  </label>
                </div>
              </div>

              <div className="dates-group">
                <div className="date-field">
                  <label>Дата начала</label>
                  <div className="date-display">{startDate}</div>
                </div>

                <div className="date-field">
                  <label>Дата окончания</label>
                  <div className="date-display">{endDate}</div>
                </div>
              </div>
            </div>

            {/* Кнопка ИИ-заполнения */}
            <button
              type="button"
              className="ai-fill-btn"
              onClick={handleAIFill}
            >
              ✨ ИИ-заполнение
            </button>

            {/* Кнопка отправки */}
            <button type="submit" className="submit-btn">
              Создать проект
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateCase;
