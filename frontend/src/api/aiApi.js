import axios from 'axios';

const fields = ['title', 'description', 'goal', 'result'];
const apiBase = (process.env.REACT_APP_AI_API_BASE_URL || '/ai').replace(/\/$/, '');
// Accepted response lengths from Requirements.md 3.4 (not the tighter prompt targets).
const caseLimits = { title: [1, 100], description: [150, 450], goal: [80, 350], result: [80, 350] };

const isCase = (value, enforceLengths = false) => value && typeof value === 'object' && !Array.isArray(value) && fields.every(
  (field) => {
    if (typeof value[field] !== 'string') return false;
    const length = value[field].trim().length;
    return length > 0 && (!enforceLengths || (length >= caseLimits[field][0] && length <= caseLimits[field][1]));
  }
);

function clientError(code) {
  const error = new Error('Invalid AI request');
  error.code = code;
  return error;
}

function prepareText(value, allowEmpty) {
  if (typeof value !== 'string') throw clientError('AI_INPUT_INVALID');
  const text = value.trim();
  if (text.length > 500 || (!allowEmpty && !text)) throw clientError('AI_INPUT_INVALID');
  return text;
}

async function request(operation, payload, signal) {
  if (signal?.aborted) throw clientError('ERR_CANCELED');
  const token = (localStorage.getItem('token') || '').trim();
  if (!token) throw clientError('AI_AUTH_REQUIRED');
  const config = {
    signal,
    // Allow the backend's 30-second request and its single retry to complete.
    timeout: 70000,
    headers: { Authorization: `Bearer ${token}` },
  };

  const { data } = await axios.post(`${apiBase}/${operation}`, payload, config);
  return data;
}

export async function generateCases(userPrompt, signal) {
  const prompt = prepareText(userPrompt, true);
  const data = await request('generate-cases', { userPrompt: prompt }, signal);
  if (!Array.isArray(data?.cases) || data.cases.length !== 3 || !data.cases.every((value) => isCase(value, true))) {
    throw new Error('Invalid generated cases');
  }
  return data.cases;
}

export async function refineCase(currentCase, userInstruction, signal) {
  const instruction = prepareText(userInstruction, false);
  if (!currentCase || typeof currentCase !== 'object' || Array.isArray(currentCase)
    || !fields.every((field) => typeof currentCase[field] === 'string')) {
    throw clientError('AI_CASE_INVALID');
  }
  const data = await request('refine-case', {
    currentCase: Object.fromEntries(fields.map((field) => [field, currentCase[field]])),
    userInstruction: instruction,
  }, signal);
  if (!isCase(data?.updatedCase, true) || typeof data?.assistantMessage !== 'string'
    || !data.assistantMessage.trim() || data.assistantMessage.trim().length > 400) {
    throw new Error('Invalid refined case');
  }
  return data;
}

export function getAiError(error, operation) {
  if (error.code === 'AI_AUTH_REQUIRED' || error.response?.status === 401) return 'Сессия истекла. Войдите в аккаунт снова.';
  if (error.code === 'AI_INPUT_INVALID' || error.response?.status === 400) return 'Проверьте запрос: текст должен содержать не более 500 символов.';
  return operation === 'generate'
    ? 'Не удалось сгенерировать идеи. Попробуйте еще раз или заполните поля вручную'
    : 'Не удалось выполнить доработку. Попробуйте отправить запрос еще раз';
}
