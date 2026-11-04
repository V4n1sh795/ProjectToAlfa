import React from 'react';

const fields = [
  { key: 'title', id: 'projectName', label: 'Название проекта', placeholder: 'Введите название проекта' },
  { key: 'description', id: 'description', label: 'Описание проекта', placeholder: 'Опишите проект' },
  { key: 'goal', id: 'projectGoal', label: 'Цель проекта', placeholder: 'Напишите цель проекта' },
  { key: 'result', id: 'projectResult', label: 'Результат проекта', placeholder: 'Напишите, какой результат должен быть достигнут' },
];

export default function ProjectCaseFields({ value, onChange, disabled = false, prefix = '' }) {
  return (
    <div className="form-column project-case-fields">
      {fields.map(({ key, id, label, placeholder }) => {
        const props = {
          id: `${prefix}${id}`,
          value: value[key],
          onChange: (event) => onChange(key, event.target.value),
          required: true,
          disabled,
          placeholder,
        };
        return (
          <div className={`form-group project-case-field--${key}`} key={key}>
            <label htmlFor={props.id}>{label} <span>*</span></label>
            {key === 'title' ? <input {...props} type="text" /> : <textarea {...props} rows={key === 'result' ? 6 : 5} />}
          </div>
        );
      })}
    </div>
  );
}
