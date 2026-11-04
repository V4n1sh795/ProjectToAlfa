import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import axios from 'axios';
import CreateCase from '../../pages/CreateCase';
import AiProjectFill from './AiProjectFill';
import { generateCases, refineCase } from '../../api/aiApi';

jest.mock('../../api/aiApi', () => ({
  ...jest.requireActual('../../api/aiApi'),
  generateCases: jest.fn(),
  refineCase: jest.fn(),
}));
jest.mock('axios', () => ({ create: jest.fn(), post: jest.fn() }));

const cases = [1, 2, 3].map((number) => ({
  title: `Проект ${number}`, description: `Описание ${number}`, goal: `Цель ${number}`, result: `Результат ${number}`,
}));

beforeEach(() => {
  jest.clearAllMocks();
  axios.create.mockReturnValue({ post: jest.fn() });
  generateCases.mockResolvedValue(cases);
});

async function generate(prompt = '') {
  if (prompt) fireEvent.change(screen.getByLabelText('Тема или идея проекта'), { target: { value: prompt } });
  fireEvent.click(screen.getByRole('button', { name: 'Сгенерировать кейсы' }));
  await screen.findByRole('heading', { name: 'Выберите понравившуюся идею' });
}

async function openChat() {
  await generate('AI в банке');
  fireEvent.click(screen.getAllByRole('button', { name: 'Доработать с ИИ' })[0]);
}

test.each(['', 'AI-проект для банка'])('Enter submits the initial topic "%s"', async (prompt) => {
  render(<AiProjectFill onApply={jest.fn()} onClose={jest.fn()} />);
  const input = screen.getByLabelText('Тема или идея проекта');
  fireEvent.change(input, { target: { value: prompt } });
  fireEvent.keyDown(input, { key: 'Enter' });
  await screen.findByRole('heading', { name: 'Выберите понравившуюся идею' });
  expect(generateCases).toHaveBeenCalledTimes(1);
  expect(generateCases).toHaveBeenCalledWith(prompt, expect.any(AbortSignal));
});

test.each([
  { key: 'Enter', shiftKey: true },
  { key: 'Enter', isComposing: true },
])('allows multiline input and composition without generating: %j', (keyEvent) => {
  render(<AiProjectFill onApply={jest.fn()} onClose={jest.fn()} />);
  const input = screen.getByLabelText('Тема или идея проекта');
  fireEvent.change(input, { target: { value: 'Моя идея' } });
  expect(fireEvent.keyDown(input, keyEvent)).toBe(true);
  expect(generateCases).not.toHaveBeenCalled();
  expect(input).toHaveValue('Моя идея');
});

test('direct selection fills all four editable project fields and preserves the rest of the form', async () => {
  render(<CreateCase />);
  fireEvent.change(screen.getByLabelText(/Роли в проекте/), { target: { value: 'Разработчик' } });
  fireEvent.change(screen.getByLabelText(/Ключевая технология/), { target: { value: 'React' } });
  fireEvent.click(screen.getByLabelText('Осенний'));
  fireEvent.click(screen.getByRole('button', { name: 'ИИ-заполнение' }));
  await generate();
  expect(generateCases).toHaveBeenCalledWith('', expect.any(AbortSignal));
  expect(screen.getAllByRole('article')).toHaveLength(3);
  fireEvent.click(screen.getAllByRole('button', { name: 'Выбрать', exact: true })[1]);
  expect(screen.getByLabelText(/Название проекта/)).toHaveValue(cases[1].title);
  expect(screen.getByLabelText(/Описание проекта/)).toHaveValue(cases[1].description);
  expect(screen.getByLabelText(/Цель проекта/)).toHaveValue(cases[1].goal);
  expect(screen.getByLabelText(/Результат проекта/)).toHaveValue(cases[1].result);
  expect(screen.getByLabelText(/Роли в проекте/)).toHaveValue('Разработчик');
  expect(screen.getByLabelText(/Ключевая технология/)).toHaveValue('React');
  expect(screen.getByLabelText('Осенний')).toBeChecked();
  fireEvent.change(screen.getByLabelText(/Цель проекта/), { target: { value: 'Ручная правка' } });
  expect(screen.getByLabelText(/Цель проекта/)).toHaveValue('Ручная правка');
  expect(axios.create().post).not.toHaveBeenCalled();
});

test('shows the loading panel, locks generation and regenerates with the same topic', async () => {
  let resolve;
  generateCases.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  render(<AiProjectFill onApply={jest.fn()} onClose={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Тема или идея проекта'), { target: { value: 'Моя тема' } });
  fireEvent.click(screen.getByRole('button', { name: 'Сгенерировать кейсы' }));
  expect(screen.getByRole('status')).toHaveTextContent('Генерируем идеи');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  await act(async () => resolve(cases));
  fireEvent.click(screen.getByRole('button', { name: 'Перегенерировать идеи' }));
  await screen.findByRole('heading', { name: 'Выберите понравившуюся идею' });
  expect(generateCases).toHaveBeenCalledTimes(2);
  expect(generateCases.mock.calls.map(([prompt]) => prompt)).toEqual(['Моя тема', 'Моя тема']);
});

test('generation errors retain the prompt and allow retry', async () => {
  generateCases.mockRejectedValueOnce({ response: { status: 504 } });
  render(<AiProjectFill onApply={jest.fn()} onClose={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Тема или идея проекта'), { target: { value: 'Не терять тему' } });
  fireEvent.click(screen.getByRole('button', { name: 'Сгенерировать кейсы' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось сгенерировать идеи');
  expect(screen.getByLabelText('Тема или идея проекта')).toHaveValue('Не терять тему');
  await generate();
  expect(screen.getAllByRole('article')).toHaveLength(3);
});

test('failed regeneration keeps the previous cases and the original topic', async () => {
  render(<AiProjectFill onApply={jest.fn()} onClose={jest.fn()} />);
  await generate('Банк');
  generateCases.mockRejectedValueOnce(new Error('Network error'));
  fireEvent.click(screen.getByRole('button', { name: 'Перегенерировать идеи' }));
  await screen.findByRole('alert');
  expect(screen.getAllByRole('article')).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: 'Назад' }));
  expect(screen.getByLabelText('Тема или идея проекта')).toHaveValue('Банк');
});

test('successive chat requests use the latest case, show replies and apply only on confirmation', async () => {
  const onApply = jest.fn();
  render(<AiProjectFill onApply={onApply} onClose={jest.fn()} />);
  await openChat();
  const updated = { ...cases[0], result: 'Веб-приложение' };
  refineCase.mockResolvedValueOnce({ updatedCase: updated, assistantMessage: 'Обновлён результат' });
  fireEvent.change(screen.getByLabelText('Сообщение ИИ-ассистенту'), { target: { value: 'Нужно веб-приложение' } });
  fireEvent.submit(screen.getByLabelText('Сообщение ИИ-ассистенту').closest('form'));
  await screen.findByText('Обновлён результат');
  expect(screen.getByLabelText(/Результат проекта/)).toHaveValue('Веб-приложение');
  expect(onApply).not.toHaveBeenCalled();
  const finalCase = { ...updated, goal: 'Уточнённая цель' };
  refineCase.mockResolvedValueOnce({ updatedCase: finalCase, assistantMessage: 'Обновлена цель' });
  fireEvent.change(screen.getByLabelText('Сообщение ИИ-ассистенту'), { target: { value: 'Уточни цель' } });
  fireEvent.keyDown(screen.getByLabelText('Сообщение ИИ-ассистенту'), { key: 'Enter' });
  await screen.findByText('Обновлена цель');
  expect(refineCase).toHaveBeenLastCalledWith(updated, 'Уточни цель', expect.any(AbortSignal));
  const log = screen.getByRole('log');
  expect(within(log).getByText('Нужно веб-приложение')).toBeInTheDocument();
  expect(within(log).getByText('Обновлён результат')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Применить изменения' }));
  expect(onApply).toHaveBeenCalledWith(finalCase);
});

test('chat failure preserves fields and history, permits retry and blocks actions while waiting', async () => {
  render(<AiProjectFill onApply={jest.fn()} onClose={jest.fn()} />);
  await openChat();
  let reject;
  refineCase.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
  fireEvent.change(screen.getByLabelText('Сообщение ИИ-ассистенту'), { target: { value: 'Измени результат' } });
  fireEvent.click(screen.getByRole('button', { name: 'Отправить сообщение' }));
  expect(screen.getByRole('button', { name: 'Применить изменения' })).toBeDisabled();
  expect(screen.getByLabelText('Сообщение ИИ-ассистенту')).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Ассистент готовит ответ');
  await act(async () => reject({ response: { status: 502 } }));
  expect(await screen.findByText(/Не удалось выполнить доработку/)).toBeInTheDocument();
  expect(screen.getByLabelText(/Результат проекта/)).toHaveValue(cases[0].result);
  expect(screen.getByLabelText('Сообщение ИИ-ассистенту')).toHaveValue('Измени результат');
  refineCase.mockResolvedValueOnce({ updatedCase: { ...cases[0], result: 'Новый результат' }, assistantMessage: 'Готово' });
  fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
  await screen.findByText('Готово');
  expect(screen.getByLabelText(/Результат проекта/)).toHaveValue('Новый результат');
  expect(within(screen.getByRole('log')).getAllByText('Измени результат')).toHaveLength(1);
});

test('back discards refinements and reopens the original generated case', async () => {
  render(<AiProjectFill onApply={jest.fn()} onClose={jest.fn()} />);
  await openChat();
  fireEvent.change(screen.getByLabelText(/Цель проекта/), { target: { value: 'Не сохранять' } });
  fireEvent.click(screen.getByRole('button', { name: /Назад к идеям/ }));
  fireEvent.click(screen.getAllByRole('button', { name: 'Доработать с ИИ' })[0]);
  expect(screen.getByLabelText(/Цель проекта/)).toHaveValue(cases[0].goal);
});

test('cancelling the assistant leaves the manual project draft untouched', () => {
  render(<CreateCase />);
  fireEvent.change(screen.getByLabelText(/Название проекта/), { target: { value: 'Мой черновик' } });
  fireEvent.click(screen.getByRole('button', { name: 'ИИ-заполнение' }));
  expect(screen.getByLabelText('Тема или идея проекта')).toHaveAttribute('maxlength', '500');
  fireEvent.click(screen.getByRole('button', { name: 'Назад' }));
  expect(screen.getByLabelText(/Название проекта/)).toHaveValue('Мой черновик');
});

test('an off-topic assistant reply leaves fields intact and allows the next refinement', async () => {
  render(<AiProjectFill onApply={jest.fn()} onClose={jest.fn()} />);
  await openChat();
  refineCase.mockResolvedValueOnce({ updatedCase: cases[0], assistantMessage: 'Уточните, какие изменения нужно внести в проект.' });
  fireEvent.change(screen.getByLabelText('Сообщение ИИ-ассистенту'), { target: { value: 'какая ты модель' } });
  fireEvent.click(screen.getByRole('button', { name: 'Отправить сообщение' }));
  await screen.findByText('Уточните, какие изменения нужно внести в проект.');
  expect(screen.getByLabelText(/Название проекта/)).toHaveValue(cases[0].title);
  expect(screen.getByLabelText(/Описание проекта/)).toHaveValue(cases[0].description);
  expect(screen.getByLabelText(/Цель проекта/)).toHaveValue(cases[0].goal);
  expect(screen.getByLabelText(/Результат проекта/)).toHaveValue(cases[0].result);
  expect(screen.queryByText(/Не удалось выполнить доработку/)).not.toBeInTheDocument();
  refineCase.mockResolvedValueOnce({ updatedCase: { ...cases[0], goal: 'Краткая цель' }, assistantMessage: 'Цель сокращена.' });
  fireEvent.change(screen.getByLabelText('Сообщение ИИ-ассистенту'), { target: { value: 'Сократи цель проекта' } });
  fireEvent.click(screen.getByRole('button', { name: 'Отправить сообщение' }));
  await screen.findByText('Цель сокращена.');
  expect(screen.getByLabelText(/Цель проекта/)).toHaveValue('Краткая цель');
  expect(refineCase).toHaveBeenLastCalledWith(cases[0], 'Сократи цель проекта', expect.any(AbortSignal));
});

test('unmounting cancels the pending request', async () => {
  generateCases.mockImplementationOnce(() => new Promise(() => {}));
  const { unmount } = render(<AiProjectFill onApply={jest.fn()} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Сгенерировать кейсы' }));
  const signal = generateCases.mock.calls[0][1];
  unmount();
  await waitFor(() => expect(signal.aborted).toBe(true));
});
