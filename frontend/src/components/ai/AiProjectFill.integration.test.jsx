import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import axios from 'axios';
import CreateCase from '../../pages/CreateCase';

// Keep the actual API client: test the form, response validation and state updates together.
jest.mock('axios', () => ({ post: jest.fn(), create: jest.fn() }));

const cases = [1, 2, 3].map((number) => ({
  title: `Проект ${number}`,
  description: 'Описание банковского проекта. '.repeat(8),
  goal: 'Измеримая бизнес-цель проекта. '.repeat(5),
  result: 'Рабочий прототип приложения. '.repeat(5),
}));

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.setItem('token', 'frontend-integration-token');
  axios.create.mockReturnValue({ post: jest.fn() });
});

function openAssistant() {
  render(<CreateCase />);
  fireEvent.click(screen.getByRole('button', { name: 'ИИ-заполнение' }));
}

async function generateAndOpenChat() {
  fireEvent.click(screen.getByRole('button', { name: 'Сгенерировать кейсы' }));
  await screen.findByRole('heading', { name: 'Выберите понравившуюся идею' });
  fireEvent.click(screen.getAllByRole('button', { name: 'Доработать с ИИ' })[0]);
}

test('invalid structured refinement leaves the draft intact and a valid retry can be applied', async () => {
  axios.post.mockResolvedValueOnce({ data: { cases } });
  openAssistant();
  await generateAndOpenChat();
  axios.post.mockResolvedValueOnce({ data: { updatedCase: { ...cases[0], goal: 'X'.repeat(351) }, assistantMessage: 'Готово' } });
  fireEvent.change(screen.getByLabelText('Сообщение ИИ-ассистенту'), { target: { value: 'Уточни цель' } });
  fireEvent.click(screen.getByRole('button', { name: 'Отправить сообщение' }));
  await screen.findByText('Не удалось выполнить доработку. Попробуйте отправить запрос еще раз');
  expect(screen.getByLabelText(/Цель проекта/)).toHaveValue(cases[0].goal);
  expect(screen.getByLabelText('Сообщение ИИ-ассистенту')).toHaveValue('Уточни цель');
  expect(axios.post).toHaveBeenCalledTimes(2);
  const updatedCase = { ...cases[0], goal: 'Уточнённая измеримая цель. '.repeat(5) };
  axios.post.mockResolvedValueOnce({ data: { updatedCase, assistantMessage: 'Цель уточнена.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
  await screen.findByText('Цель уточнена.');
  fireEvent.click(screen.getByRole('button', { name: 'Применить изменения' }));
  expect(screen.getByLabelText(/Цель проекта/)).toHaveValue(updatedCase.goal);
  expect(axios.create().post).not.toHaveBeenCalled();
});

test('invalid structured generation preserves the topic and does not show invalid cards', async () => {
  axios.post.mockResolvedValueOnce({ data: { cases: [{ ...cases[0], title: 'X'.repeat(101) }, cases[1], cases[2]] } });
  openAssistant();
  fireEvent.change(screen.getByLabelText('Тема или идея проекта'), { target: { value: 'Моя тема' } });
  fireEvent.click(screen.getByRole('button', { name: 'Сгенерировать кейсы' }));
  await screen.findByRole('alert');
  expect(screen.getByLabelText('Тема или идея проекта')).toHaveValue('Моя тема');
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
  expect(axios.post).toHaveBeenCalledTimes(1);
});

test('a missing session is reported without sending the topic or losing the draft', async () => {
  openAssistant();
  localStorage.removeItem('token');
  fireEvent.change(screen.getByLabelText('Тема или идея проекта'), { target: { value: 'Не потерять тему' } });
  fireEvent.click(screen.getByRole('button', { name: 'Сгенерировать кейсы' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Сессия истекла. Войдите в аккаунт снова.');
  expect(screen.getByLabelText('Тема или идея проекта')).toHaveValue('Не потерять тему');
  expect(axios.post).not.toHaveBeenCalled();
});
