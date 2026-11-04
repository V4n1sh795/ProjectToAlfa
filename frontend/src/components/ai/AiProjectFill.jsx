import React, { useEffect, useRef, useState } from 'react';
import { generateCases, getAiError, refineCase } from '../../api/aiApi';
import ProjectCaseFields from './ProjectCaseFields';
import regenerateIcon from '../../assets/ai/icon-regenerate.svg';
import sendIcon from '../../assets/ai/icon-send.svg';
import loadingPanel from '../../assets/ai/loading-panel.svg';
import './AiProjectFill.css';

export default function AiProjectFill({ onApply, onClose }) {
  const [step, setStep] = useState('prompt');
  const [prompt, setPrompt] = useState('');
  const [cases, setCases] = useState([]);
  const [generationError, setGenerationError] = useState('');
  const [currentCase, setCurrentCase] = useState(null);
  const [messages, setMessages] = useState([]);
  const [instruction, setInstruction] = useState('');
  const [refining, setRefining] = useState(false);
  const [failedInstruction, setFailedInstruction] = useState('');
  const requestRef = useRef(null);
  const headingRef = useRef(null);
  const inputRef = useRef(null);
  const historyRef = useRef(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.closest('.main-content')?.scrollTo?.(0, 0);
  }, [step]);

  useEffect(() => {
    const history = historyRef.current;
    if (history) history.scrollTop = history.scrollHeight;
  }, [messages, refining]);

  async function handleGenerate(event) {
    event?.preventDefault();
    if (requestRef.current) return;
    const previousStep = step;
    const controller = new AbortController();
    requestRef.current = controller;
    setGenerationError('');
    setStep('loading');
    try {
      const generated = await generateCases(prompt, controller.signal);
      if (controller.signal.aborted) return;
      setCases(generated);
      setStep('cases');
    } catch (error) {
      if (controller.signal.aborted) return;
      setGenerationError(getAiError(error, 'generate'));
      setStep(previousStep);
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  }

  function openRefinement(projectCase) {
    setCurrentCase({ ...projectCase });
    setMessages([]);
    setInstruction('');
    setFailedInstruction('');
    setStep('refine');
  }

  async function handleRefine(event, retryInstruction) {
    event?.preventDefault();
    const text = (retryInstruction || instruction).trim();
    if (!text || text.length > 500 || requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setRefining(true);
    setFailedInstruction('');
    setMessages((history) => [
      ...history.filter((message) => message.role !== 'error'),
      ...(!retryInstruction ? [{ role: 'user', text }] : []),
    ]);
    setInstruction('');
    try {
      const data = await refineCase(currentCase, text, controller.signal);
      if (controller.signal.aborted) return;
      setCurrentCase(data.updatedCase);
      setMessages((history) => [...history, { role: 'assistant', text: data.assistantMessage }]);
    } catch (error) {
      if (controller.signal.aborted) return;
      setMessages((history) => [...history, { role: 'error', text: getAiError(error, 'refine') }]);
      setFailedInstruction(text);
      setInstruction(text);
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (!controller.signal.aborted) {
        setRefining(false);
        // Wait until React enables the composer before restoring keyboard focus.
        requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
      }
    }
  }

  const goBack = () => {
    if (requestRef.current) return;
    if (step === 'refine') {
      setCurrentCase(null);
      setMessages([]);
      setStep('cases');
    } else {
      setGenerationError('');
      setStep('prompt');
    }
  };

  if (step === 'loading') {
    return (
      <section className="ai-fill ai-fill--loading" aria-busy="true" aria-label="Генерация идей">
        <img className="ai-fill__loading-panel" src={loadingPanel} alt="" />
        <p className="ai-fill__sr-only" role="status">Генерируем идеи. Пожалуйста, подождите.</p>
      </section>
    );
  }

  if (step === 'prompt') {
    return (
      <section className="ai-fill ai-fill--prompt" aria-labelledby="ai-prompt-heading">
        <button className="ai-fill__button ai-fill__button--black ai-fill__prompt-back" type="button" onClick={onClose}>Назад</button>
        <div className="ai-fill__prompt-content">
          <h3 id="ai-prompt-heading" ref={headingRef} tabIndex={-1}>Расскажите о своей идее!</h3>
          <form className="ai-fill__prompt-form" onSubmit={handleGenerate}>
            <label className="ai-fill__sr-only" htmlFor="ai-prompt">Тема или идея проекта</label>
            <textarea
              id="ai-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  handleGenerate(event);
                }
              }}
              maxLength={500}
              placeholder="Хочу кейс, чтобы студенты поработали с AI"
              aria-describedby="ai-prompt-hint"
            />
            <button className="ai-fill__button ai-fill__generate" type="submit">Сгенерировать кейсы</button>
          </form>
          <p className="ai-fill__sr-only" id="ai-prompt-hint">До 500 символов. Можно оставить поле пустым — ассистент предложит идеи. Enter — отправить, Shift+Enter — новая строка.</p>
          {prompt.length >= 450 && <p className="ai-fill__counter">{prompt.length} / 500</p>}
          {generationError && <p className="ai-fill__error" role="alert">{generationError}</p>}
        </div>
      </section>
    );
  }

  if (step === 'cases') {
    return (
      <section className="ai-fill ai-fill--cases" aria-labelledby="ai-cases-heading">
        <button className="ai-fill__button ai-fill__button--black ai-fill__page-back" type="button" onClick={goBack}>Назад</button>
        <div className="ai-fill__cases-content">
          <div className="ai-fill__cases-heading">
            <h3 id="ai-cases-heading" ref={headingRef} tabIndex={-1}>Выберите понравившуюся идею</h3>
            <button className="ai-fill__button ai-fill__regenerate" type="button" onClick={handleGenerate} aria-label="Перегенерировать идеи">
              <img src={regenerateIcon} alt="" />
              Перегенирировать
            </button>
          </div>
          {generationError && <p className="ai-fill__error" role="alert">{generationError}</p>}
          <div className="ai-fill__case-list">
            {cases.map((projectCase, index) => (
              <article className="ai-fill__case" key={index} aria-labelledby={`ai-case-${index}`}>
                <div className="ai-fill__case-text">
                  <h4 id={`ai-case-${index}`}>{projectCase.title}</h4>
                  <p>{projectCase.description}</p>
                </div>
                <div className="ai-fill__case-actions">
                  <button className="ai-fill__button ai-fill__button--black ai-fill__refine" type="button" onClick={() => openRefinement(projectCase)}>Доработать с ИИ</button>
                  <button className="ai-fill__button ai-fill__select" type="button" onClick={() => onApply(projectCase)}>Выбрать</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="ai-fill ai-fill--refine" aria-label="Доработка проекта с ИИ">
      <h3 className="ai-fill__sr-only" ref={headingRef} tabIndex={-1}>Доработка проекта с ИИ</h3>
      <button className="ai-fill__button ai-fill__button--black ai-fill__page-back" type="button" onClick={goBack} disabled={refining} aria-label="Назад к идеям, отменить доработку">Назад</button>
      <div className="form-grid">
        <ProjectCaseFields
          value={currentCase}
          onChange={(key, value) => setCurrentCase((previous) => ({ ...previous, [key]: value }))}
          disabled={refining}
          prefix="ai-"
        />
        <div className="ai-fill__chat-column">
          <div className="ai-fill__chat" aria-busy={refining}>
            <div className="ai-fill__history" ref={historyRef} role="log" aria-label="Переписка с ИИ-ассистентом" aria-live="polite" aria-relevant="additions text" tabIndex={0}>
              {messages.map((message, index) => (
                <div className={`ai-fill__message ai-fill__message--${message.role}`} key={index}>
                  <span className="ai-fill__sr-only">{message.role === 'user' ? 'Вы: ' : message.role === 'assistant' ? 'ИИ-ассистент: ' : 'Ошибка: '}</span>
                  {message.text.replace(/[\u2028\u2029]/g, '\n')}
                  {message.role === 'error' && failedInstruction && (
                    <button className="ai-fill__retry" type="button" disabled={refining} onClick={() => handleRefine(null, failedInstruction)}>Повторить</button>
                  )}
                </div>
              ))}
              {refining && <div className="ai-fill__message ai-fill__message--assistant ai-fill__typing" role="status"><span /><span /><span /><span className="ai-fill__sr-only">Ассистент готовит ответ</span></div>}
            </div>
            <form className="ai-fill__composer" onSubmit={handleRefine}>
              <label className="ai-fill__sr-only" htmlFor="ai-instruction">Сообщение ИИ-ассистенту</label>
              <textarea
                id="ai-instruction"
                ref={inputRef}
                rows={1}
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    handleRefine(event);
                  }
                }}
                maxLength={500}
                disabled={refining}
                placeholder="Введите запрос"
                aria-describedby="ai-instruction-hint"
              />
              <button className="ai-fill__send" type="submit" disabled={refining || !instruction.trim()} aria-label="Отправить сообщение"><img src={sendIcon} alt="" /></button>
            </form>
          </div>
          <span id="ai-instruction-hint" className="ai-fill__sr-only">До 500 символов. Enter — отправить, Shift+Enter — новая строка.</span>
          {instruction.length >= 450 && <p className="ai-fill__counter">{instruction.length} / 500</p>}
          <button
            className="ai-fill__button ai-fill__apply"
            type="button"
            disabled={refining || !['title', 'description', 'goal', 'result'].every((key) => currentCase[key].trim())}
            onClick={() => onApply(currentCase)}
          >Применить изменения</button>
        </div>
      </div>
    </section>
  );
}
