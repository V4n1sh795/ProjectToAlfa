import axios from 'axios';
import React, { useState, useEffect } from 'react';
import './css/CreateCase.css'; // опционально, для стилей
const CreateCase = () => {
  // Состояния для полей формы
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [curators, setCurators] = useState([]); // массив кураторов (по умолчанию одно поле)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [semester, setSemester] = useState('autumn'); // 'autumn' или 'spring'
  const [availableCurators, SetAvailableCurators] = useState([]);
  const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    });
  // Список доступных кураторов (для выпадающего списка)
  useEffect(() => {
    api.get("/curators")
        .then(response => SetAvailableCurators(response.data))
        .catch(error => console.error("Error fetching curators:", error));
    }, []);
  
  // Обработчик изменения куратора по индексу
  const handleCuratorChange = (index, value) => {
    const updatedCurators = [...curators];
    updatedCurators[index] = value;
    setCurators(updatedCurators);
  };

  // Добавление нового поля куратора
  const addCuratorField = () => {
    setCurators([...curators, '']);
  };

  // Удаление поля куратора (опционально, для удобства)
  const removeCuratorField = (index) => {
    if (curators.length === 1) return; // оставляем хотя бы одно поле
    const updatedCurators = curators.filter((_, i) => i !== index);
    setCurators(updatedCurators);
  };
  const isPosted = async (projectData) => {
    try {
        const response = await api.post("/project", projectData);
        console.log(response);
        
        if (response.status === 200 || response.status === 201) {
        alert('Проект создан! Проверьте консоль для просмотра данных.');
        return true;
        } else {
        console.log(response.error || 'Ошибка при создании проекта');
        return false;
        }
    } catch (error) {
        console.error("Error creating project:", error);
        alert('Ошибка при создании проекта: ' + (error.response?.data?.message || error.message));
        return false;
    }
    };
  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Формируем объект проекта
    const projectData = {
      name: projectName,
      description: description,
      curators: curators.filter(curator => curator !== ''), // удаляем пустые строки
      startDate: startDate,
      endDate: endDate,
      semester: semester === 'autumn' ? 'Осенний' : 'Весенний'
    };
    
    console.log('Данные проекта:', projectData);
    
    const success = await isPosted(projectData)
  
//     if (success) {
//         // Опционально: сброс формы
//         resetForm();
//   }
  };

  return (
    <div className="form-container">
      <h2>Создание нового проекта</h2>
      <form onSubmit={handleSubmit}>
        {/* Поле Название */}
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

        {/* Поле Описание */}
        <div className="form-group">
          <label htmlFor="description">Описание проекта *</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows="5"
            placeholder="Подробно опишите цели, задачи и содержание проекта..."
          />
        </div>

        {/* Блок Кураторы */}
        <div className="form-group">
          <label>Кураторы проекта</label>
          <div className="curators-list">
            {curators.map((curator, index) => (
              <div key={index} className="curator-item">
                <select
                  value={curator}
                  onChange={(e) => handleCuratorChange(index, e.target.value)}
                  className="curator-select"
                >
                  <option value="" disabled>Выберите куратора</option>
                  {availableCurators.map((cur) => (
                    <option key={cur.id} value={cur.id}>
                      {cur.name}
                    </option>
                  ))}
                </select>
                {curators.length > 1 && (
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeCuratorField(index)}
                    title="Удалить куратора"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="add-curator-btn"
            onClick={addCuratorField}
          >
            + Добавить куратора
          </button>
          <small className="field-hint">
            Выберите кураторов из списка. Можно добавить нескольких.
          </small>
        </div>

        {/* Даты начала и конца */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="startDate">Дата начала *</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="endDate">Дата окончания *</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Семестр */}
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

        {/* Кнопка отправки */}
        <button type="submit" className="submit-btn">
          Создать проект
        </button>
      </form>
    </div>
  );
};

export default CreateCase;