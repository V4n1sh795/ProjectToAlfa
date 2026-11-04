import axios from 'axios';
import React, { useState, useEffect } from 'react';
import closeAlertIcon from "../assets/icons/close_alert.svg";
import AiProjectFill from '../components/ai/AiProjectFill';
import ProjectCaseFields from '../components/ai/ProjectCaseFields';
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
  const [showAiFill, setShowAiFill] = useState(false);

  const applyAiCase = (projectCase) => {
    setProjectName(projectCase.title);
    setDescription(projectCase.description);
    setProjectGoal(projectCase.goal);
    setProjectResult(projectCase.result);
    setShowAiFill(false);
    requestAnimationFrame(() => {
      const title = document.getElementById('create-project-heading');
      title?.focus({ preventScroll: true });
      title?.closest('.main-content')?.scrollTo?.(0, 0);
    });
  };

  const updateCaseField = (key, value) => {
    const setters = { title: setProjectName, description: setDescription, goal: setProjectGoal, result: setProjectResult };
    setters[key](value);
  };
  
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
      <h2 id="create-project-heading" tabIndex={-1}>Создание нового проекта</h2>
      
      {showSuccess && (
        <div className="create-alert-backdrop">
          <section className="create-success-alert">
            <button
              className="create-success-alert__close"
              type="button"
              onClick={() => setShowSuccess(false)}
              aria-label="Закрыть уведомление"
            >
              <img src={closeAlertIcon} alt="" />
            </button>
            <h3>Успешно</h3>
            <p>
              Проект создан.<br />
              Вы можете обсудить её в чате или<br />
              отредактировать в менеджере проектов
            </p>
          </section>
        </div>
      )}
      
      {showAiFill ? (
        <AiProjectFill onApply={applyAiCase} onClose={() => setShowAiFill(false)} />
      ) : (
      <form className="create-project-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* Левая колонка */}
          <ProjectCaseFields
            value={{ title: projectName, description, goal: projectGoal, result: projectResult }}
            onChange={updateCaseField}
          />

          {/* Правая колонка */}
          <div className="form-column">
            {/* Роли в проекте */}
            <div className="form-group">
              <label htmlFor="roles">Роли в проекте <span>*</span></label>
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
              <label htmlFor="keyTechnology">Ключевая технология <span>*</span></label>
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
                <label>Семестр <span>*</span></label>
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

            {/* Кнопка отправки */}
            <div className="create-project-actions">
              <button type="button" className="ai-fill__button create-project-ai-button" onClick={() => setShowAiFill(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m4 20 13-13 3 3L7 23M14 10l3 3M5 2v4M3 4h4M19 17v4M17 19h4M19 1v4M17 3h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ИИ-заполнение
              </button>
              <button type="submit" className="submit-btn">Создать проект</button>
            </div>
          </div>
        </div>
      </form>
      )}
    </div>
  );
};

export default CreateCase;
