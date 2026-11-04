import axios from 'axios';
import { generateCases, getAiError, refineCase } from './aiApi';

jest.mock('axios', () => ({ post: jest.fn() }));

const projectCase = {
  title: 'Проект',
  description: 'Описание банковского проекта. '.repeat(8),
  goal: 'Измеримая бизнес-цель проекта. '.repeat(5),
  result: 'Рабочий прототип приложения. '.repeat(5),
};
const cases = [projectCase, projectCase, projectCase];

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.setItem('token', 'test-token');
});

test('generates three cases using the authenticated API contract, including an empty topic', async () => {
  axios.post.mockResolvedValue({ data: { cases } });
  const signal = new AbortController().signal;
  await expect(generateCases('   ', signal)).resolves.toEqual(cases);
  expect(axios.post).toHaveBeenCalledWith('/api/ai/generate-cases', { userPrompt: '' }, expect.objectContaining({
    signal,
    headers: { Authorization: 'Bearer test-token' },
  }));
});

test('refinement sends only the current four fields and a trimmed instruction', async () => {
  const response = { updatedCase: projectCase, assistantMessage: 'Готово' };
  axios.post.mockResolvedValue({ data: response });
  await expect(refineCase({ ...projectCase, extra: 'ignore' }, '  Уточни цель  ')).resolves.toEqual(response);
  expect(axios.post).toHaveBeenCalledWith('/api/ai/refine-case', {
    currentCase: projectCase, userInstruction: 'Уточни цель',
  }, expect.any(Object));
});

test('uses the existing chat proxy only when the structured endpoint is absent', async () => {
  axios.post.mockRejectedValueOnce({ response: { status: 404 } })
    .mockResolvedValueOnce({ data: { answer: `\`\`\`json\n${JSON.stringify({ cases })}\n\`\`\`` } });
  await expect(generateCases('Банковское приложение')).resolves.toEqual(cases);
  expect(axios.post).toHaveBeenLastCalledWith('/ai/chat', {
    prompt: expect.stringContaining('Банковское приложение'),
  }, expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }));
});

test.each([400, 401, 502, 504])('does not retry a %s response through another endpoint', async (status) => {
  const error = { response: { status } };
  axios.post.mockRejectedValue(error);
  await expect(generateCases('Тема')).rejects.toEqual(error);
  expect(axios.post).toHaveBeenCalledTimes(1);
});

test.each([
  { cases: [projectCase] },
  { cases: [projectCase, projectCase, { ...projectCase, goal: '' }] },
  { cases: [projectCase, projectCase, { title: 'Неполный проект' }] },
  '<html>Not an API response</html>',
])('rejects malformed generation responses', async (data) => {
  axios.post.mockResolvedValue({ data });
  await expect(generateCases('Тема')).rejects.toThrow('Invalid generated cases');
});

test('rejects refinement without the assistant response instead of replacing the draft', async () => {
  axios.post.mockResolvedValue({ data: { updatedCase: projectCase } });
  await expect(refineCase(projectCase, 'Уточни')).rejects.toThrow('Invalid refined case');
});

test('does not make a request after cancellation', async () => {
  const controller = new AbortController();
  controller.abort();
  axios.post.mockRejectedValue({ response: { status: 404 } });
  await expect(generateCases('Тема', controller.signal)).rejects.toBeDefined();
  expect(axios.post).not.toHaveBeenCalled();
});

test('refines through the existing proxy and validates both parts of its answer', async () => {
  const response = { updatedCase: { ...projectCase, goal: 'Новая цель' }, assistantMessage: 'Обновлена цель' };
  axios.post.mockRejectedValueOnce({ response: { status: 405 } })
    .mockResolvedValueOnce({ data: { answer: JSON.stringify(response) } });
  await expect(refineCase(projectCase, 'Поменяй цель')).resolves.toEqual(response);
  expect(axios.post).toHaveBeenLastCalledWith('/ai/chat', {
    prompt: expect.stringContaining(JSON.stringify(projectCase)),
  }, expect.any(Object));
});

test.each(['assistentMessage', 'assistorMessage', 'assessorMessage', 'assistant_message'])('accepts the unambiguous %s reply returned by the text proxy', async (messageKey) => {
  const updatedCase = { ...projectCase, result: 'Веб-приложение с панелью администратора' };
  axios.post.mockRejectedValueOnce({ response: { status: 404 } })
    .mockResolvedValueOnce({ data: { answer: JSON.stringify({
      updatedCase,
      [messageKey]: 'Проект обновлён: добавлена панель администратора.',
    }) } });
  await expect(refineCase(projectCase, 'Добавь панель администратора')).resolves.toEqual({
    updatedCase,
    assistantMessage: 'Проект обновлён: добавлена панель администратора.',
  });
});

test('keeps validation strict for the structured refinement endpoint', async () => {
  axios.post.mockResolvedValue({ data: { updatedCase: projectCase, assistentMessage: 'Неверный контракт' } });
  await expect(refineCase(projectCase, 'Уточни')).rejects.toThrow('Invalid refined case');
});

test('an off-topic reply with the observed assessorMessage key preserves the project', async () => {
  const message = 'Ваш запрос не относится к учебному проекту. Пожалуйста, уточните, какие изменения вы хотите внести.';
  axios.post.mockRejectedValueOnce({ response: { status: 404 } })
    .mockResolvedValueOnce({ data: { answer: JSON.stringify({ updatedCase: projectCase, assessorMessage: message }) } });
  await expect(refineCase(projectCase, 'Кто победил на выборах в госдуму 2026')).resolves.toEqual({
    updatedCase: projectCase, assistantMessage: message,
  });
});

test.each([
  'Я помогаю доработать проект. Уточните, какие изменения вы хотите внести.',
  'Извините, я не могу обсуждать эту тему.',
  JSON.stringify('Уточните пожелание к проекту.'),
])('shows a conversational response without replacing project fields: %s', async (answer) => {
  axios.post.mockRejectedValueOnce({ response: { status: 404 } })
    .mockResolvedValueOnce({ data: { answer } });
  const response = await refineCase(projectCase, 'какая ты модель');
  expect(response.updatedCase).toEqual(projectCase);
  expect(response.assistantMessage).toBe(answer.startsWith('"') ? JSON.parse(answer) : answer);
});

test.each([
  '{"updatedCase":',
  '[{"title":',
  '```json\n{"updatedCase":\n```',
  '<html>502 Bad Gateway</html>',
  '',
])('does not turn a malformed structured response into a chat reply: %s', async (answer) => {
  axios.post.mockRejectedValueOnce({ response: { status: 404 } })
    .mockResolvedValueOnce({ data: { answer } });
  await expect(refineCase(projectCase, 'Уточни цель')).rejects.toThrow();
});

test('rejects ambiguous message keys instead of guessing the assistant reply', async () => {
  axios.post.mockRejectedValueOnce({ response: { status: 404 } })
    .mockResolvedValueOnce({ data: { answer: JSON.stringify({ updatedCase: projectCase, assessorMessage: 'Одна реплика', assistorMessage: 'Другая реплика' }) } });
  await expect(refineCase(projectCase, 'Уточни')).rejects.toThrow('Invalid refined case');
});

test('prefers the canonical assistantMessage over an alternative message field', async () => {
  axios.post.mockRejectedValueOnce({ response: { status: 404 } })
    .mockResolvedValueOnce({ data: { answer: JSON.stringify({ updatedCase: projectCase, assistantMessage: 'Ответ ассистента', assessorMessage: 'Другой текст' }) } });
  await expect(refineCase(projectCase, 'Уточни')).resolves.toEqual({ updatedCase: projectCase, assistantMessage: 'Ответ ассистента' });
});

test('still rejects a text proxy response with no assistant message', async () => {
  axios.post.mockRejectedValueOnce({ response: { status: 404 } })
    .mockResolvedValueOnce({ data: { answer: JSON.stringify({ updatedCase: projectCase }) } });
  await expect(refineCase(projectCase, 'Уточни')).rejects.toThrow('Invalid refined case');
});

test('invalid JSON from the proxy is rejected without fabricating project data', async () => {
  axios.post.mockRejectedValueOnce({ response: { status: 404 } })
    .mockResolvedValueOnce({ data: { answer: 'Ответ, который не является JSON' } });
  await expect(generateCases('Тема')).rejects.toThrow();
});

test.each([null, undefined, {}, 'X'.repeat(501)])('rejects an invalid generation topic before HTTP: %p', async (prompt) => {
  await expect(generateCases(prompt)).rejects.toMatchObject({ code: 'AI_INPUT_INVALID' });
  expect(axios.post).not.toHaveBeenCalled();
});

test.each(['', '   ', null, {}, 'X'.repeat(501)])('rejects an invalid instruction before HTTP: %p', async (instruction) => {
  await expect(refineCase(projectCase, instruction)).rejects.toMatchObject({ code: 'AI_INPUT_INVALID' });
  expect(axios.post).not.toHaveBeenCalled();
});

test('accepts exactly 500 characters after trimming without truncating the topic', async () => {
  const prompt = 'X'.repeat(500);
  axios.post.mockResolvedValue({ data: { cases } });
  await expect(generateCases(`  ${prompt}  `)).resolves.toEqual(cases);
  expect(axios.post).toHaveBeenCalledWith('/api/ai/generate-cases', { userPrompt: prompt }, expect.any(Object));
});

test('accepts exactly 500 characters in a refinement instruction', async () => {
  const instruction = 'X'.repeat(500);
  const reply = { updatedCase: projectCase, assistantMessage: 'Готово' };
  axios.post.mockResolvedValue({ data: reply });
  await expect(refineCase(projectCase, `  ${instruction}  `)).resolves.toEqual(reply);
  expect(axios.post).toHaveBeenCalledWith('/api/ai/refine-case', { currentCase: projectCase, userInstruction: instruction }, expect.any(Object));
});

test.each([null, [], {}, { ...projectCase, goal: null }])('rejects a malformed snapshot before HTTP: %p', async (currentCase) => {
  await expect(refineCase(currentCase, 'Уточни цель')).rejects.toMatchObject({ code: 'AI_CASE_INVALID' });
  expect(axios.post).not.toHaveBeenCalled();
});

test('allows the assistant to fill a field the user cleared in the preview', async () => {
  const currentCase = { ...projectCase, goal: '' };
  const reply = { updatedCase: projectCase, assistantMessage: 'Цель заполнена.' };
  axios.post.mockResolvedValue({ data: reply });
  await expect(refineCase(currentCase, 'Заполни цель')).resolves.toEqual(reply);
  expect(axios.post).toHaveBeenCalledWith('/api/ai/refine-case', { currentCase, userInstruction: 'Заполни цель' }, expect.any(Object));
});

test.each(['generate', 'refine'])('does not send an unauthenticated %s request', async (operation) => {
  localStorage.removeItem('token');
  const call = operation === 'generate' ? generateCases('Тема') : refineCase(projectCase, 'Уточни');
  await expect(call).rejects.toMatchObject({ code: 'AI_AUTH_REQUIRED' });
  expect(axios.post).not.toHaveBeenCalled();
});

test.each([
  ['title', 0], ['title', 101],
  ['description', 149], ['description', 451],
  ['goal', 79], ['goal', 351], ['result', 79], ['result', 351],
])('rejects structured generation with %s length %i without switching to the proxy', async (field, length) => {
  const invalid = { ...projectCase, [field]: 'X'.repeat(length) };
  axios.post.mockResolvedValue({ data: { cases: [invalid, projectCase, projectCase] } });
  await expect(generateCases('Тема')).rejects.toThrow('Invalid generated cases');
  expect(axios.post).toHaveBeenCalledTimes(1);
});

test.each([
  { title: 'T', description: 'D'.repeat(150), goal: 'G'.repeat(80), result: 'R'.repeat(80) },
  { title: 'T'.repeat(100), description: 'D'.repeat(450), goal: 'G'.repeat(350), result: 'R'.repeat(350) },
])('accepts the response boundaries from section 3.4', async (value) => {
  const response = { cases: [value, value, value] };
  axios.post.mockResolvedValue({ data: response });
  await expect(generateCases('Тема')).resolves.toEqual(response.cases);
});

test.each([['description', 149], ['goal', 351], ['result', 351]])('rejects structured refinement with %s length %i', async (field, length) => {
  axios.post.mockResolvedValue({ data: { updatedCase: { ...projectCase, [field]: 'X'.repeat(length) }, assistantMessage: 'Готово' } });
  await expect(refineCase(projectCase, 'Уточни')).rejects.toThrow('Invalid refined case');
  expect(axios.post).toHaveBeenCalledTimes(1);
});

test('rejects a structured assistant message exceeding 400 characters', async () => {
  axios.post.mockResolvedValue({ data: { updatedCase: projectCase, assistantMessage: 'X'.repeat(401) } });
  await expect(refineCase(projectCase, 'Уточни')).rejects.toThrow('Invalid refined case');
});

test('accepts a structured assistant message of exactly 400 characters', async () => {
  const reply = { updatedCase: projectCase, assistantMessage: 'X'.repeat(400) };
  axios.post.mockResolvedValue({ data: reply });
  await expect(refineCase(projectCase, 'Уточни')).resolves.toEqual(reply);
});

test('retains existing text-proxy compatibility with shorter generated descriptions and goals', async () => {
  const short = { title: 'Проект', description: 'Описание', goal: 'Цель', result: 'Результат' };
  const generated = [short, short, short];
  axios.post.mockRejectedValueOnce({ response: { status: 404 } })
    .mockResolvedValueOnce({ data: { answer: JSON.stringify({ cases: generated }) } });
  await expect(generateCases('Тема')).resolves.toEqual(generated);
  expect(axios.post).toHaveBeenCalledTimes(2);
});

test('retains existing proxy chat messages without truncating them or retrying', async () => {
  const message = 'Ответ ассистента. '.repeat(30);
  axios.post.mockRejectedValueOnce({ response: { status: 404 } })
    .mockResolvedValueOnce({ data: { answer: JSON.stringify({ updatedCase: projectCase, assessorMessage: message }) } });
  await expect(refineCase(projectCase, 'Уточни')).resolves.toEqual({ updatedCase: projectCase, assistantMessage: message });
  expect(axios.post).toHaveBeenCalledTimes(2);
});

test('local validation and session errors use the existing interface messages', () => {
  expect(getAiError({ code: 'AI_AUTH_REQUIRED' }, 'refine')).toBe(getAiError({ response: { status: 401 } }, 'refine'));
  expect(getAiError({ code: 'AI_INPUT_INVALID' }, 'generate')).toBe(getAiError({ response: { status: 400 } }, 'generate'));
});
