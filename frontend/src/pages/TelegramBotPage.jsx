import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";
import TeamDetails from "../components/TeamDetails";
import { CreateTeamForm, getDayLabel } from "./CreateTeam";
import { createTelegramBotPreview, declineExampleId } from "./telegramBotExamples";
import collapsedIcon from "../assets/telegram-bot/case-collapsed.svg";
import expandedIcon from "../assets/telegram-bot/case-expanded.svg";
import closeIcon from "../assets/telegram-bot/decline-close.svg";
import "./css/TelegramBotPage.css";

const rootPath = "/telegram-bot";
const teamPath = (id) => `${rootPath}/team/${encodeURIComponent(id)}`;
const dateFormatter = new Intl.DateTimeFormat("ru-RU", { timeZone: "UTC" });
const roleLabels = { "Тим-лид": "Тимлидер", Бэкенд: "Разработчик" };

function DeclineForm({ focusOnOpen, onCancel, onDecline, saving, error }) {
  const [reason, setReason] = useState("");
  const titleId = useId();
  const input = useRef(null);

  useEffect(() => {
    if (focusOnOpen) input.current?.focus({ preventScroll: true });
  }, [focusOnOpen]);

  function submit(event) {
    event.preventDefault();
    if (!saving && reason.trim()) onDecline(reason.trim());
  }

  return (
    <form
      className="telegram-decline"
      aria-labelledby={titleId}
      aria-busy={saving}
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          if (!saving) onCancel();
        }
      }}
    >
      <p id={titleId}>Опишите, почему вы хотите отклонить команду.</p>
      <button className="telegram-decline__close" type="button" onClick={onCancel} disabled={saving} aria-label="Закрыть форму отказа">
        <img src={closeIcon} alt="" />
      </button>
      <input ref={input} aria-labelledby={titleId} placeholder="Введите текст" value={reason}
        onChange={(event) => setReason(event.target.value)} readOnly={saving} required />
      {error && <p className="telegram-error" role="alert">{error}</p>}
      <button className="telegram-button telegram-button--outline" type="submit" disabled={saving} aria-disabled={saving || !reason.trim()}>
        Отклонить команду
      </button>
    </form>
  );
}

function RequestRow({ request, decline, href, onOpenDecline, onCloseDecline, onAccept, onDecline }) {
  const declineButton = useRef(null);
  const teamLink = useRef(null);
  const rowRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const date = request.date ? new Date(request.date) : null;

  function cancelDecline() {
    onCloseDecline();
    setError("");
    declineButton.current?.focus();
  }

  async function submitDecision(reason) {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      if (reason) await onDecline(request.id, reason, rowRef.current);
      else {
        await onAccept(request.id);
        teamLink.current?.focus();
      }
    } catch {
      setError(reason ? "Не удалось отклонить команду. Повторите попытку." : "Не удалось принять команду. Повторите попытку.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li ref={rowRef}>
      <div className="telegram-requests__row">
        <Link to={href(teamPath(request.id))} className="telegram-requests__team" ref={teamLink}>{request.team.name}</Link>
        {date && !Number.isNaN(date.getTime()) ? <time dateTime={request.date}>{dateFormatter.format(date)}</time> : <span>—</span>}
        {request.status === "accepted" && (
          <Link className="telegram-button telegram-button--red telegram-requests__meeting" to={href(`${teamPath(request.id)}/schedule`)}>
            Создать регулярную встречу
          </Link>
        )}
        {request.status === "pending" && (
          <div className="telegram-requests__decision">
            <button className="telegram-button telegram-button--red" type="button" ref={declineButton}
              onClick={() => { setError(""); onOpenDecline(request.id); }} disabled={saving} aria-expanded={Boolean(decline)}>
              Отклонить
            </button>
            <button className="telegram-button telegram-button--green" type="button"
              onClick={() => submitDecision()} disabled={saving}>
              Принять
            </button>
          </div>
        )}
      </div>
      {decline && (
        <DeclineForm
          focusOnOpen={decline.focusOnOpen}
          onCancel={cancelDecline}
          onDecline={submitDecision}
          saving={saving}
          error={error}
        />
      )}
      {!decline && error && <p className="telegram-error" role="alert">{error}</p>}
    </li>
  );
}

function CaseRequests({ project, expanded, decline, href, onToggle, onRecruiting, onOpenDecline, onAccept, onDecline }) {
  const caseId = useId();
  const requests = project.requests.filter(({ status }) => status !== "declined");
  const showDecline = requests.some(({ id }) => id === decline?.id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function changeRecruiting(recruiting) {
    if (saving || recruiting === project.recruiting) return;
    setError("");
    setSaving(true);
    try {
      await onRecruiting(recruiting);
    } catch {
      setError("Не удалось изменить режим набора. Повторите попытку.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="telegram-case">
      <div className="telegram-case__header">
        <h3>
          <button type="button" className="telegram-case__toggle" aria-expanded={expanded}
            aria-controls={caseId} onClick={onToggle}>
            <img src={expanded ? expandedIcon : collapsedIcon} alt="" />
            {project.name}
          </button>
        </h3>
        <div className="telegram-case__recruiting" role="group" aria-label={`Набор команд: ${project.name}`}>
          <button type="button" aria-pressed={!project.recruiting} disabled={saving} onClick={() => changeRecruiting(false)}>Стоп</button>
          <button type="button" aria-pressed={project.recruiting} disabled={saving} onClick={() => changeRecruiting(true)}>Набор</button>
        </div>
      </div>
      {error && <p className="telegram-error telegram-case__error" role="alert">{error}</p>}
      <div id={caseId} className="telegram-requests" hidden={!expanded}>
        {requests.length > 0 ? (
          <>
            <div className={`telegram-requests__head${showDecline ? " telegram-requests__head--decline" : ""}`}>
              <span>Записанные команды</span>
              <span>Время</span>
            </div>
            <ul aria-label={`Записанные команды: ${project.name}`}>
              {requests.map((request) => (
                <RequestRow key={request.id} request={request} decline={request.id === decline?.id ? decline : null}
                  href={href} onOpenDecline={onOpenDecline} onCloseDecline={() => onOpenDecline(null)}
                  onAccept={onAccept} onDecline={onDecline} />
              ))}
            </ul>
          </>
        ) : <p className="telegram-requests__empty">Записанных команд пока нет.</p>}
      </div>
    </section>
  );
}

function TelegramTeam({ data, mode, href, preview, onSave }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const routeLifetime = useRef(null);
  const project = data.cases.find(({ requests }) => requests.some((request) => String(request.id) === id));
  const request = project?.requests.find((item) => String(item.id) === id);

  useEffect(() => {
    const controller = new AbortController();
    routeLifetime.current = controller;
    return () => controller.abort();
  }, [id, mode]);

  if (!request || request.status === "declined") return <Navigate to={href(rootPath)} replace />;
  if (mode === "schedule" && request.status !== "accepted") {
    return <Navigate to={href(teamPath(id))} replace />;
  }

  const { team } = request;
  if (mode !== "details") {
    const editing = mode === "edit";
    return (
      <div className="telegram-team-form">
        <CreateTeamForm
          key={`${id}-${mode}`}
          projects={data.projects}
          initialDraft={team}
          title={editing ? "Редактирование команды" : undefined}
          submitLabel={editing ? "Сохранить" : undefined}
          requireSchedule={!editing || request.status === "scheduled"}
          onCreate={async (draft) => {
            const currentRoute = routeLifetime.current;
            await onSave(project.id, request.id, mode, draft);
            if (!currentRoute?.signal.aborted) navigate(href(teamPath(id)), { replace: true });
          }}
        />
      </div>
    );
  }

  const cardData = {
    projectName: data.projects.find(({ id }) => String(id) === String(team.projectId))?.name,
    meetingDay: getDayLabel(team.callDay),
    meetingTime: team.callTime,
    artifacts: team.artifacts ?? "",
    members: preview ? team.members.map((member) => ({
      ...member,
      role: roleLabels[member.role] ?? member.role,
    })) : team.members,
    curators: team.curators ?? [],
    grades: team.grades ?? {},
    comment: team.comment ?? "",
  };

  return (
    <div className="team-page telegram-team" style={{ "--telegram-member-rows": cardData.members.length + 1 }}>
      <article className="team-card team-card--details">
        <h1>{team.name}</h1>
        <TeamDetails cardData={cardData} onEdit={() => navigate(href(`${teamPath(id)}/edit`))} />
      </article>
    </div>
  );
}

function TelegramBotWorkspace({ source, preview, declineExample }) {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [decline, setDecline] = useState(() =>
    declineExample ? { id: declineExampleId, focusOnOpen: false } : null,
  );
  const pageHeading = useRef(null);
  const demoDescription = useId();

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const result = await source.load({ signal: controller.signal });
        if (controller.signal.aborted) return;
        setData(result);
        const firstCaseWithRequests = result.cases.find(({ requests }) => requests.some(({ status }) => status !== "declined"));
        setExpandedId(firstCaseWithRequests?.id ?? result.cases[0]?.id ?? null);
      } catch {
        if (!controller.signal.aborted) setLoadError(true);
      }
    }

    load();
    return () => controller.abort();
  }, [source, loadAttempt]);

  const href = (path) => declineExample ? `${path}?preview=decline` : path;

  function updateCase(caseId, update) {
    setData((current) => ({
      ...current,
      cases: current.cases.map((project) => project.id === caseId ? update(project) : project),
    }));
  }

  async function saveRequest(caseId, operation) {
    const updated = await operation;
    updateCase(caseId, (project) => ({
      ...project,
      requests: project.requests.map((request) => request.id === updated.id ? updated : request),
    }));
    setDecline((current) => current?.id === updated.id ? null : current);
  }

  if (!data) {
    return (
      <section className="telegram-page">
        <h1>Управление Telegram-ботом</h1>
        <div className="telegram-page__panel">
          {loadError ? (
            <>
              <p className="telegram-error" role="alert">Не удалось загрузить кейсы и заявки.</p>
              <button className="telegram-button telegram-button--red" type="button" onClick={() => {
                setLoadError(false);
                setLoadAttempt((attempt) => attempt + 1);
              }}>Повторить</button>
            </>
          ) : <p role="status">Загрузка кейсов и заявок…</p>}
        </div>
      </section>
    );
  }

  function saveTeam(caseId, requestId, mode, draft) {
    return saveRequest(caseId, mode === "edit"
      ? source.updateTeam(caseId, requestId, draft)
      : source.scheduleTeam(caseId, requestId, draft));
  }

  const teamProps = { data, href, preview, onSave: saveTeam };

  return (
    <Routes>
      <Route index element={
        <section className="telegram-page" aria-describedby={preview ? demoDescription : undefined}>
          <h1 ref={pageHeading} tabIndex={-1}>Управление Telegram-ботом</h1>
          {preview && <p className="telegram-sr-only" id={demoDescription}>
            Демонстрационные данные. Действия не отправляются в Telegram и не сохраняются на сервере.
          </p>}
          <div className="telegram-page__panel">
            <h2>Записанные команды</h2>
            <h2>Кейсы</h2>
            <div className="telegram-page__cases">
              {data.cases.length === 0 && <p>Кейсов пока нет.</p>}
              {data.cases.map((project) => (
                <CaseRequests key={project.id} project={project} expanded={expandedId === project.id}
                  decline={decline} href={href}
                  onOpenDecline={(id) => setDecline(id !== null ? { id, focusOnOpen: true } : null)}
                  onAccept={(id) => saveRequest(project.id, source.acceptRequest(project.id, id))}
                  onDecline={async (id, reason, row) => {
                    await saveRequest(project.id, source.declineRequest(project.id, id, reason));
                    if (row?.contains(document.activeElement) || document.activeElement === document.body) {
                      pageHeading.current?.focus({ preventScroll: true });
                    }
                  }}
                  onToggle={() => {
                    setExpandedId((current) => current === project.id ? null : project.id);
                    setDecline(null);
                  }}
                  onRecruiting={async (recruiting) => {
                    const saved = await source.setRecruiting(project.id, recruiting);
                    updateCase(project.id, (item) => ({ ...item, recruiting: saved }));
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      } />
      <Route path="team/:id" element={<TelegramTeam {...teamProps} mode="details" />} />
      <Route path="team/:id/schedule" element={<TelegramTeam {...teamProps} mode="schedule" />} />
      <Route path="team/:id/edit" element={<TelegramTeam {...teamProps} mode="edit" />} />
      <Route path="*" element={<Navigate to={href(rootPath)} replace />} />
    </Routes>
  );
}

/**
 * dataSource adapts the API to this screen. load({ signal }) resolves to { cases, projects }.
 * A case has { id, name, recruiting, requests }, a project option has { id, name }.
 * Requests have a unique id, an ISO date, team data and a pending/accepted/declined/scheduled status.
 * The team contains the CreateTeamForm draft plus optional artifacts, curators, grades and comment.
 * setRecruiting(caseId, recruiting) resolves to the stored boolean. Request mutations take
 * (caseId, requestId) and resolve to the updated request. declineRequest also takes the reason;
 * scheduleTeam and updateTeam also take the team draft.
 */
export default function TelegramBotPage({ dataSource }) {
  const [params] = useSearchParams();
  const declineExample = !dataSource && params.get("preview") === "decline";
  const source = useMemo(() => dataSource ?? createTelegramBotPreview(declineExample), [dataSource, declineExample]);
  return <TelegramBotWorkspace key={declineExample ? "decline" : "default"}
    source={source} preview={!dataSource} declineExample={declineExample} />;
}
