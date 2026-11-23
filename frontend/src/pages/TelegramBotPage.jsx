import { useEffect, useId, useRef, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";
import TeamDetails from "../components/TeamDetails";
import { CreateTeamForm } from "./CreateTeam";
import { createExampleCases, exampleProjects } from "./telegramBotExamples";
import collapsedIcon from "../assets/telegram-bot/case-collapsed.svg";
import expandedIcon from "../assets/telegram-bot/case-expanded.svg";
import closeIcon from "../assets/telegram-bot/decline-close.svg";
import "./css/TelegramBotPage.css";

const rootPath = "/telegram-bot";
const teamPath = (id) => `${rootPath}/team/${id}`;
const dateFormatter = new Intl.DateTimeFormat("ru-RU", { timeZone: "UTC" });
const weekdayNames = {
  Monday: "Понедельник",
  Tuesday: "Вторник",
  Wednesday: "Среда",
  Thursday: "Четверг",
  Friday: "Пятница",
  Saturday: "Суббота",
  Sunday: "Воскресенье",
};

function DeclineForm({ focusOnOpen, onCancel, onDecline }) {
  const [reason, setReason] = useState("");
  const titleId = useId();
  const input = useRef(null);

  useEffect(() => {
    if (focusOnOpen) input.current?.focus({ preventScroll: true });
  }, [focusOnOpen]);

  function submit(event) {
    event.preventDefault();
    if (reason.trim()) onDecline(reason.trim());
  }

  return (
    <form
      className="telegram-decline"
      aria-labelledby={titleId}
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onCancel();
        }
      }}
    >
      <p id={titleId}>Опишите, почему вы хотите отклонить команду.</p>
      <button className="telegram-decline__close" type="button" onClick={onCancel} aria-label="Закрыть форму отказа">
        <img src={closeIcon} alt="" />
      </button>
      <input ref={input} aria-labelledby={titleId} placeholder="Введите текст" value={reason}
        onChange={(event) => setReason(event.target.value)} required />
      <button className="telegram-button telegram-button--outline" type="submit" aria-disabled={!reason.trim()}>
        Отклонить команду
      </button>
    </form>
  );
}

function RequestRow({ request, decline, onOpenDecline, onCloseDecline, onUpdate }) {
  const declineButton = useRef(null);
  const teamLink = useRef(null);

  function cancelDecline() {
    onCloseDecline();
    declineButton.current?.focus();
  }

  return (
    <li>
      <div className="telegram-requests__row">
        <Link to={teamPath(request.id)} className="telegram-requests__team" ref={teamLink}>{request.team.name}</Link>
        <time dateTime={request.date}>{dateFormatter.format(new Date(request.date))}</time>
        {request.status === "accepted" && (
          <Link className="telegram-button telegram-button--red telegram-requests__meeting" to={`${teamPath(request.id)}/schedule`}>
            Создать регулярную встречу
          </Link>
        )}
        {request.status === "pending" && (
          <div className="telegram-requests__decision">
            <button className="telegram-button telegram-button--red" type="button" ref={declineButton}
              onClick={() => onOpenDecline(request.id)} aria-expanded={Boolean(decline)}>
              Отклонить
            </button>
            <button className="telegram-button telegram-button--green" type="button"
              onClick={() => {
                onUpdate(request.id, { status: "accepted" });
                teamLink.current?.focus();
              }}>
              Принять
            </button>
          </div>
        )}
      </div>
      {decline && (
        <DeclineForm
          focusOnOpen={decline.focusOnOpen}
          onCancel={cancelDecline}
          onDecline={(reason) => onUpdate(request.id, { status: "declined", reason })}
        />
      )}
    </li>
  );
}

function CaseRequests({ project, expanded, decline, onToggle, onRecruiting, onDecline, onUpdate }) {
  const caseId = useId();
  const requests = project.requests.filter(({ status }) => status !== "declined");
  const showDecline = requests.some(({ id }) => id === decline?.id);

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
          <button type="button" aria-pressed={!project.recruiting} onClick={() => onRecruiting(false)}>Стоп</button>
          <button type="button" aria-pressed={project.recruiting} onClick={() => onRecruiting(true)}>Набор</button>
        </div>
      </div>
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
                  onOpenDecline={onDecline} onCloseDecline={() => onDecline(null)} onUpdate={onUpdate} />
              ))}
            </ul>
          </>
        ) : <p className="telegram-requests__empty">Записанных команд пока нет.</p>}
      </div>
    </section>
  );
}

function ExampleTeam({ cases, mode, onUpdate }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const request = cases.flatMap((project) => project.requests).find((item) => item.id === id);

  if (!request || request.status === "declined") return <Navigate to={rootPath} replace />;
  if (mode === "schedule" && request.status !== "accepted") {
    return <Navigate to={teamPath(id)} replace />;
  }

  const { team } = request;
  if (mode !== "details") {
    const editing = mode === "edit";
    return (
      <CreateTeamForm
        key={`${id}-${mode}`}
        projects={exampleProjects}
        initialDraft={team}
        title={editing ? "Редактирование команды" : undefined}
        submitLabel={editing ? "Сохранить" : undefined}
        onCreate={(draft) => {
          onUpdate(id, { team: draft, status: editing ? request.status : "scheduled" });
          navigate(teamPath(id), { replace: true });
        }}
      />
    );
  }

  const cardData = {
    projectName: exampleProjects.find(({ id }) => id === team.projectId)?.name,
    meetingDay: weekdayNames[team.callDay] ?? "",
    meetingTime: team.callTime,
    artifacts: team.members.find(({ contact }) => contact)?.contact ?? "",
    members: team.members.map((member) => ({
      ...member,
      role: { "Тим-лид": "Тимлидер", Бэкенд: "Разработчик" }[member.role] ?? member.role,
    })),
    curators: [],
    grades: {},
    comment: "",
  };

  return (
    <div className="team-page">
      <article className="team-card team-card--details">
        <h1>{team.name}</h1>
        <TeamDetails cardData={cardData} onEdit={() => navigate(`${teamPath(id)}/edit`)} />
      </article>
    </div>
  );
}

function TelegramBotWorkspace({ declineExample }) {
  const [cases, setCases] = useState(() => createExampleCases(declineExample));
  const [expandedId, setExpandedId] = useState("assistant");
  const [decline, setDecline] = useState(() =>
    declineExample ? { id: "decline-example", focusOnOpen: false } : null,
  );
  const pageHeading = useRef(null);
  const demoDescription = useId();

  function updateRequest(id, patch) {
    setCases((current) => current.map((project) => ({
      ...project,
      requests: project.requests.map((request) => request.id === id ? { ...request, ...patch } : request),
    })));
    if (id === decline?.id) setDecline(null);
    if (patch.status === "declined") pageHeading.current?.focus();
  }

  return (
    <Routes>
      <Route index element={
        <section className="telegram-page" aria-describedby={demoDescription}>
          <h1 ref={pageHeading} tabIndex={-1}>Управление Telegram-ботом</h1>
          <p className="telegram-sr-only" id={demoDescription}>
            Демонстрационные данные. Действия не отправляются в Telegram и не сохраняются на сервере.
          </p>
          <div className="telegram-page__panel">
            <h2>Записанные команды</h2>
            <h2>Кейсы</h2>
            <div className="telegram-page__cases">
              {cases.map((project) => (
                <CaseRequests key={project.id} project={project} expanded={expandedId === project.id}
                  decline={decline}
                  onDecline={(id) => setDecline(id ? { id, focusOnOpen: true } : null)}
                  onUpdate={updateRequest}
                  onToggle={() => {
                    setExpandedId((current) => current === project.id ? null : project.id);
                    setDecline(null);
                  }}
                  onRecruiting={(recruiting) => setCases((current) => current.map((item) =>
                    item.id === project.id ? { ...item, recruiting } : item
                  ))}
                />
              ))}
            </div>
          </div>
        </section>
      } />
      <Route path="team/:id" element={<ExampleTeam cases={cases} mode="details" onUpdate={updateRequest} />} />
      <Route path="team/:id/schedule" element={<ExampleTeam cases={cases} mode="schedule" onUpdate={updateRequest} />} />
      <Route path="team/:id/edit" element={<ExampleTeam cases={cases} mode="edit" onUpdate={updateRequest} />} />
      <Route path="*" element={<Navigate to={rootPath} replace />} />
    </Routes>
  );
}

export default function TelegramBotPage() {
  const [params] = useSearchParams();
  const [declineExample] = useState(() => params.get("preview") === "decline");
  return <TelegramBotWorkspace declineExample={declineExample} />;
}
