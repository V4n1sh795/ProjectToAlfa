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
  expect(axios.post).toHaveBeenCalledWith('/ai/generate-cases', { userPrompt: '' }, expect.objectContaining({
    signal,
    headers: { Authorization: 'Bearer test-token' },
  }));
});

test('refinement sends only the current four fields and a trimmed instruction', async () => {
  const response = { updatedCase: projectCase, assistantMessage: 'Готово' };
  axios.post.mockResolvedValue({ data: response });
  await expect(refineCase({ ...projectCase, extra: 'ignore' }, '  Уточни цель  ')).resolves.toEqual(response);
  expect(axios.post).toHaveBeenCalledWith('/ai/refine-case', {
    currentCase: projectCase, userInstruction: 'Уточни цель',
  }, expect.any(Object));
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
  expect(axios.post).toHaveBeenCalledWith('/ai/generate-cases', { userPrompt: prompt }, expect.any(Object));
});

test('accepts exactly 500 characters in a refinement instruction', async () => {
  const instruction = 'X'.repeat(500);
  const reply = { updatedCase: projectCase, assistantMessage: 'Готово' };
  axios.post.mockResolvedValue({ data: reply });
  await expect(refineCase(projectCase, `  ${instruction}  `)).resolves.toEqual(reply);
  expect(axios.post).toHaveBeenCalledWith('/ai/refine-case', { currentCase: projectCase, userInstruction: instruction }, expect.any(Object));
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
  expect(axios.post).toHaveBeenCalledWith('/ai/refine-case', { currentCase, userInstruction: 'Заполни цель' }, expect.any(Object));
});

test.each(['generate', 'refine'])('does not send an unauthenticated %s request', async (operation) => {
  localStorage.removeItem('token');
  const call = operation === 'generate' ? generateCases('Тема') : refineCase(projectCase, 'Уточни');
  await expect(call).rejects.toMatchObject({ code: 'AI_AUTH_REQUIRED' });
  expect(axios.post).not.toHaveBeenCalled();
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

test('local validation and session errors use the existing interface messages', () => {
  expect(getAiError({ code: 'AI_AUTH_REQUIRED' }, 'refine')).toBe(getAiError({ response: { status: 401 } }, 'refine'));
  expect(getAiError({ code: 'AI_INPUT_INVALID' }, 'generate')).toBe(getAiError({ response: { status: 400 } }, 'generate'));
});
