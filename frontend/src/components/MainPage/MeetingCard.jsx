import { useEffect, useId, useState } from "react";
import {
  addMeetingComment,
  closeTask,
  createTaskForTeam,
  getMeetingCurators,
  getMeetingMembers,
  getMeetingsByDate,
  getMember,
  getTask,
  getTeam,
  saveMeetingCurators,
  saveMeetingMembers,
} from "../../api/meetingsApi";
import closeAlertIcon from "../../assets/icons/close_alert.svg";
import showMoreIcon from "../../assets/icons/show_more.svg";
import "./MeetingCard.css";

const monthNames = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const statusLabels = {
  scheduled: "Начать встречу",
  finished: "Завершено",
  in_progress: "Идёт встреча",
};

const missingRoleLabel = "Роль не указана";

const readField = (source, ...names) => {
  if (!source) return undefined;

  for (const name of names) {
    if (source[name] !== undefined) {
      return source[name];
    }
  }

  return undefined;
};

const getPairKey = (pair, fallback) => {
  if (!pair || typeof pair === "string") return fallback;
  return readField(pair, "key", "Key", "id", "Id") ?? fallback;
};

const getPairValue = (pair) => {
  if (typeof pair === "string") return pair;
  return readField(pair, "value", "Value", "name", "Name") || "";
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const formatTime = (time) => {
  if (!time) return "--:--";
  return String(time).slice(0, 5);
};

const getEndTime = (startAt) => {
  const [hours, minutes] = formatTime(startAt).split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return "--:--";
  }

  const totalMinutes = hours * 60 + minutes + 30;
  const endHours = String(Math.floor(totalMinutes / 60) % 24).padStart(2, "0");
  const endMinutes = String(totalMinutes % 60).padStart(2, "0");

  return `${endHours}:${endMinutes}`;
};

const getDateParts = (date) => {
  const [year, month, day] = String(date || "")
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!year || !month || !day) return null;

  return { year, month, day };
};

const formatDate = (date) => {
  const parts = getDateParts(date);

  if (!parts) return "";

  return `${parts.day} ${monthNames[parts.month - 1]}`;
};

const formatWeekDay = (date) => {
  const parts = getDateParts(date);

  if (!parts) return "";

  const weekDays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const parsedDate = new Date(parts.year, parts.month - 1, parts.day);

  return weekDays[parsedDate.getDay()];
};

const getNextWeekDeadline = (date) => {
  const parts = getDateParts(date);

  if (!parts) return new Date().toISOString();

  const nextDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  nextDate.setUTCDate(nextDate.getUTCDate() + 7);

  return nextDate.toISOString();
};

const getDateAfterDays = (date, days) => {
  const parts = getDateParts(date);

  if (!parts) return "";

  const nextDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate.toISOString().slice(0, 10);
};

const getCommentsText = (comments = []) => {
  if (!Array.isArray(comments)) {
    return String(comments || "");
  }

  return comments.filter(Boolean).join("\n");
};

const getStatusLabel = (status) => {
  return statusLabels[status] || status;
};

const getTitleSizeClass = (title = "") => {
  if (title.length > 22) {
    return "meeting-card__title--xs";
  }

  if (title.length > 16) {
    return "meeting-card__title--small";
  }

  if (title.length > 10) {
    return "meeting-card__title--medium";
  }

  return "";
};

const getParticipantFallbacks = (participants = []) => {
  return participants.map((name, index) => ({
    id: `fallback-participant-${index}`,
    name,
    role: missingRoleLabel,
  }));
};

const createFallbackDetails = (meeting) => ({
  loaded: false,
  meetingId: meeting.id,
  nextMeetingId: null,
  teamId: meeting.teamId,
  participants: getParticipantFallbacks(meeting.participants),
  mentors: [],
  previousParticipants: [],
  previousMentors: [],
  tasks: [],
  comments: [],
});

const getTaskId = (task) => readField(task, "id", "Id");
const getTaskName = (task) =>
  readField(task, "name", "Name") || "сделать что-то";
const getTaskKey = (task) => String(getTaskId(task) ?? getTaskName(task));
const getTaskDeadlineDate = (task) => {
  const deadline = readField(task, "deadline", "Deadline");

  return deadline ? String(deadline).slice(0, 10) : "";
};

const filterTasksForMeetingDate = (tasks, meetingDate) => {
  const normalizedMeetingDate = String(meetingDate || "").slice(0, 10);

  if (!normalizedMeetingDate) return tasks;

  return tasks.filter(
    (task) => getTaskDeadlineDate(task) === normalizedMeetingDate,
  );
};

const getMemberRole = (memberDetails, index) => {
  const profiles = readField(memberDetails, "profiles", "Profiles") || [];
  const firstProfile = String(profiles[0] || "").trim();

  if (!firstProfile) {
    return missingRoleLabel;
  }

  const shortRole = firstProfile.split(/\s+/).slice(0, 2).join(" ");

  return shortRole || missingRoleLabel;
};

const getTeamPairs = (team, fieldName) => {
  const pairs =
    readField(
      team,
      fieldName,
      `${fieldName[0].toUpperCase()}${fieldName.slice(1)}`,
    ) || [];

  return pairs
    .map((pair, index) => ({
      id: getPairKey(pair, `${fieldName}-${index}`),
      name: getPairValue(pair),
    }))
    .filter((item) => item.name);
};

const getRawMeetingTime = (meeting) =>
  formatTime(readField(meeting, "time", "Time", "startAt", "StartAt"));

const getMeetingId = (meeting) => readField(meeting, "id", "Id");

const findTeamMeeting = (meetings, teamId, startAt) =>
  meetings.find(
    (dayMeeting) =>
      readField(dayMeeting, "teamId", "TeamId") === teamId &&
      getRawMeetingTime(dayMeeting) === formatTime(startAt),
  ) ||
  meetings.find(
    (dayMeeting) => readField(dayMeeting, "teamId", "TeamId") === teamId,
  );

const loadTasksByIds = async (taskIds = []) => {
  const loadedTasks = await Promise.all(
    taskIds.map((taskId) => getTask(taskId).catch(() => null)),
  );

  return loadedTasks.filter(Boolean);
};

const loadNextMeetingDetails = async ({ currentDate, startAt, teamId }) => {
  const emptyDetails = {
    meetingId: null,
    tasks: [],
    comments: [],
  };

  if (!teamId) return emptyDetails;

  for (const daysAfter of [7, 14, 21, 28]) {
    const nextDate = getDateAfterDays(currentDate, daysAfter);

    if (!nextDate) continue;

    const nextDayMeetings = await getMeetingsByDate(nextDate).catch(() => []);
    const nextMeeting = findTeamMeeting(nextDayMeetings, teamId, startAt);

    if (nextMeeting) {
      const taskIds = readField(nextMeeting, "tasks", "Tasks") || [];
      const tasks = await loadTasksByIds(taskIds);

      return {
        meetingId: getMeetingId(nextMeeting),
        tasks: filterTasksForMeetingDate(tasks, nextDate),
        comments:
          readField(
            nextMeeting,
            "comments",
            "Comments",
            "comment",
            "Comment",
          ) || [],
      };
    }
  }

  return emptyDetails;
};

const getArrayPayload = (data, fieldNames = []) => {
  if (Array.isArray(data)) return data;

  for (const fieldName of fieldNames) {
    const pascalFieldName = `${fieldName[0].toUpperCase()}${fieldName.slice(1)}`;
    const value = readField(data, fieldName, pascalFieldName);

    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
};

const normalizeAttendanceItems = (items, knownItems = []) =>
  items
    .map((item, index) => {
      if (typeof item === "number" || typeof item === "string") {
        const knownItem = knownItems.find(
          (known) => String(known.id) === String(item),
        );

        return knownItem || { id: item, name: String(item) };
      }

      const id = getPairKey(item, `attendance-${index}`);
      const knownItem = knownItems.find(
        (known) => String(known.id) === String(id),
      );
      const name =
        getPairValue(item) ||
        readField(item, "fullName", "FullName", "fio", "Fio") ||
        knownItem?.name ||
        "";

      return { ...(knownItem || {}), id, name };
    })
    .filter((item) => item.name);

const loadMeetingAttendance = async (meetingId, participants, mentors) => {
  if (!meetingId) {
    return { participants: [], mentors: [] };
  }

  const [membersData, curatorsData] = await Promise.all([
    getMeetingMembers(meetingId),
    getMeetingCurators(meetingId),
  ]);


  const memberItems = getArrayPayload(membersData, [
    "members",
    "memberIds",
    "ids",
  ]);
  const curatorItems = getArrayPayload(curatorsData, [
    "curators",
    "curatorIds",
    "ids",
  ]);

  return {
    participants: normalizeAttendanceItems(memberItems, participants),
    mentors: normalizeAttendanceItems(curatorItems, mentors),
  };
};

const loadPreviousMeetingAttendance = async ({
  currentDate,
  startAt,
  teamId,
  participants,
  mentors,
}) => {
  if (!teamId) {
    return { participants: [], mentors: [] };
  }

  for (const daysBefore of [7, 14, 21, 28]) {
    const previousDate = getDateAfterDays(currentDate, -daysBefore);

    if (!previousDate) continue;

    const previousDayMeetings = await getMeetingsByDate(previousDate).catch(
      () => [],
    );
    const previousMeeting = findTeamMeeting(
      previousDayMeetings,
      teamId,
      startAt,
    );

    if (previousMeeting) {
      return loadMeetingAttendance(
        getMeetingId(previousMeeting),
        participants,
        mentors,
      );
    }
  }

  return { participants: [], mentors: [] };
};

const getCheckedIds = (items, checkedValues) =>
  items
    .filter((item) => checkedValues.includes(String(item.id ?? item.name)))
    .map((item) => Number(item.id))
    .filter(Number.isFinite);

const ignoreMissingEndpointError = async (request) => {
  try {
    return await request;
  } catch (error) {
    const status = error?.response?.status;

    if (status === 404 || status === 405) {
      return null;
    }

    throw error;
  }
};

function MeetingCard({ meeting }) {
  const cardId = useId().replace(/:/g, "");
  const [isOpen, setIsOpen] = useState(false);
  const [isFullOpen, setIsFullOpen] = useState(false);
  const [details, setDetails] = useState(() => createFallbackDetails(meeting));
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [checkedTasks, setCheckedTasks] = useState([]);
  const [presentParticipants, setPresentParticipants] = useState([]);
  const [presentMentors, setPresentMentors] = useState([]);
  const [nextTaskText, setNextTaskText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [initialNextTaskText, setInitialNextTaskText] = useState("");
  const [initialCommentText, setInitialCommentText] = useState("");
  const [saveStatus, setSaveStatus] = useState("idle");

  useEffect(() => {
    setIsOpen(false);
    setIsFullOpen(false);
    setDetails(createFallbackDetails(meeting));
    setCheckedTasks([]);
    setPresentParticipants([]);
    setPresentMentors([]);
    setNextTaskText("");
    setCommentText("");
    setInitialNextTaskText("");
    setInitialCommentText("");
    setSaveStatus("idle");
    setDetailsError("");
  }, [meeting]);

  useEffect(() => {
    if (!isOpen || details.loaded) {
      return undefined;
    }

    let shouldUpdate = true;

    async function loadDetails() {
      setIsDetailsLoading(true);
      setDetailsError("");

      try {
        const dayMeetings = await getMeetingsByDate(meeting.date);
        const candidateMeetings = dayMeetings.filter(
          (dayMeeting) =>
            getRawMeetingTime(dayMeeting) === formatTime(meeting.startAt),
        );
        const meetingsToCheck =
          candidateMeetings.length > 0 ? candidateMeetings : dayMeetings;
        const enrichedMeetings = await Promise.all(
          meetingsToCheck.map(async (dayMeeting) => {
            const teamId = readField(dayMeeting, "teamId", "TeamId");
            const team = teamId
              ? await getTeam(teamId).catch(() => null)
              : null;

            return { dayMeeting, team };
          }),
        );
        const matchedMeeting =
          enrichedMeetings.find(
            ({ team }) =>
              normalizeText(readField(team, "name", "Name")) ===
              normalizeText(meeting.teamName),
          ) || enrichedMeetings[0];

        if (!matchedMeeting) {
          throw new Error("Встреча не найдена в дневном расписании");
        }

        const rawMeeting = matchedMeeting.dayMeeting;
        const team = matchedMeeting.team;
        const rawParticipants = getTeamPairs(team, "members");
        const memberDetails = await Promise.all(
          rawParticipants.map((participant) =>
            getMember(participant.id).catch(() => null),
          ),
        );
        const participants =
          rawParticipants.length > 0
            ? rawParticipants.map((participant, index) => ({
                ...participant,
                role: getMemberRole(memberDetails[index], index),
              }))
            : getParticipantFallbacks(meeting.participants);
        const mentors = getTeamPairs(team, "curators");
        const taskIds = readField(rawMeeting, "tasks", "Tasks") || [];
        const loadedTasks = await loadTasksByIds(taskIds);
        const tasks = filterTasksForMeetingDate(loadedTasks, meeting.date);
        const comments =
          readField(rawMeeting, "comments", "Comments", "comment", "Comment") ||
          [];
        const currentMeetingTeamId = readField(rawMeeting, "teamId", "TeamId");
        const currentMeetingId = getMeetingId(rawMeeting);
        const nextMeetingDetails = await loadNextMeetingDetails({
          currentDate: meeting.date,
          startAt: meeting.startAt,
          teamId: currentMeetingTeamId,
        });
        const [currentAttendance, previousAttendance] = await Promise.all([
          loadMeetingAttendance(currentMeetingId, participants, mentors),
          loadPreviousMeetingAttendance({
            currentDate: meeting.date,
            startAt: meeting.startAt,
            teamId: currentMeetingTeamId,
            participants,
            mentors,
          }),
        ]);
        const nextMeetingTasksText = nextMeetingDetails.tasks
          .map(getTaskName)
          .join("\n");
        const nextMeetingCommentsText = getCommentsText(
          nextMeetingDetails.comments,
        );

        if (!shouldUpdate) return;

        setDetails({
          loaded: true,
          meetingId: currentMeetingId,
          nextMeetingId: nextMeetingDetails.meetingId,
          teamId: currentMeetingTeamId,
          participants,
          mentors,
          previousParticipants: previousAttendance.participants,
          previousMentors: previousAttendance.mentors,
          tasks,
          comments,
        });
        setPresentParticipants((currentValues) =>
          currentValues.length > 0
            ? currentValues
            : currentAttendance.participants.map((participant) =>
                String(participant.id ?? participant.name),
              ),
        );
        setPresentMentors((currentValues) =>
          currentValues.length > 0
            ? currentValues
            : currentAttendance.mentors.map((mentor) =>
                String(mentor.id ?? mentor.name),
              ),
        );
        setInitialNextTaskText(nextMeetingTasksText);
        setInitialCommentText(nextMeetingCommentsText);
        setNextTaskText((currentText) =>
          currentText.trim() ? currentText : nextMeetingTasksText,
        );
        setCommentText((currentText) =>
          currentText.trim() ? currentText : nextMeetingCommentsText,
        );
      } catch (error) {
        if (!shouldUpdate) return;

        setDetails((currentDetails) => ({
          ...currentDetails,
          loaded: true,
        }));
        setDetailsError(error.message);
      } finally {
        if (shouldUpdate) {
          setIsDetailsLoading(false);
        }
      }
    }

    loadDetails();

    return () => {
      shouldUpdate = false;
    };
  }, [details.loaded, isOpen, meeting]);

  const toggleValue = (setter, value) => {
    setter((currentValues) =>
      currentValues.includes(value)
        ? currentValues.filter((currentValue) => currentValue !== value)
        : [...currentValues, value],
    );
  };

  const handleCardClick = () => {
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleCardKeyDown = (event) => {
    if (!isOpen && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  const handleSave = async (event) => {
    event.stopPropagation();
    setSaveStatus("saving");

    try {
      const requests = [];
      const taskIdsToClose = [];

      const normalizedCommentText = commentText.trim();
      const normalizedInitialCommentText = initialCommentText.trim();
      const normalizedNextTaskText = nextTaskText.trim();
      const normalizedInitialNextTaskText = initialNextTaskText.trim();

      if (
        normalizedCommentText &&
        normalizedCommentText !== normalizedInitialCommentText
      ) {
        if (!details.nextMeetingId) {
          throw new Error("Next meeting was not found");
        }

        requests.push(
          addMeetingComment(details.nextMeetingId, normalizedCommentText),
        );
      }

      if (
        details.teamId &&
        normalizedNextTaskText &&
        normalizedNextTaskText !== normalizedInitialNextTaskText
      ) {
        requests.push(
          createTaskForTeam(meeting.date, {
            teamId: details.teamId,
            name: normalizedNextTaskText,
            deadline: getNextWeekDeadline(meeting.date),
          }),
        );
      }

      if (details.meetingId) {
        const memberIds = getCheckedIds(
          details.participants,
          presentParticipants,
        );
        const curatorIds = getCheckedIds(details.mentors, presentMentors);

        requests.push(
          ignoreMissingEndpointError(
            saveMeetingMembers(details.meetingId, memberIds),
          ),
          ignoreMissingEndpointError(
            saveMeetingCurators(details.meetingId, curatorIds),
          ),
        );
      }

      details.tasks.forEach((task) => {
        const taskId = getTaskId(task);

        if (taskId && checkedTasks.includes(getTaskKey(task))) {
          taskIdsToClose.push(taskId);
        }
      });

      await Promise.all(requests);

      for (const taskId of taskIdsToClose) {
        await closeTask(taskId);
      }

      setSaveStatus("saved");
      setInitialCommentText(normalizedCommentText);
      setInitialNextTaskText(normalizedNextTaskText);
    } catch {
      setSaveStatus("error");
    }
  };

  const renderTaskList = () => {
    if (details.tasks.length === 0) {
      return <p className="meeting-card__empty-tasks">Задачи не добавлены</p>;
    }

    return (
      <ul className="meeting-card__task-list">
        {details.tasks.map((task, index) => {
          const taskKey = getTaskKey(task);
          const inputId = `${cardId}-task-${index}`;

          return (
            <li key={taskKey}>
              <input
                id={inputId}
                className="meeting-card__checkbox"
                type="checkbox"
                checked={checkedTasks.includes(taskKey)}
                onChange={() => toggleValue(setCheckedTasks, taskKey)}
              />
              <label htmlFor={inputId}>{getTaskName(task)}</label>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderAttendanceList = (items, checkedValues, setter, inputPrefix) => (
    <div className="meeting-card__attendance-list">
      {items.map((item, index) => {
        const inputId = `${cardId}-${inputPrefix}-${index}`;
        const itemKey = String(item.id ?? item.name);

        return (
          <label
            key={itemKey}
            className="meeting-card__attendance-item"
            htmlFor={inputId}
          >
            <input
              id={inputId}
              className="meeting-card__checkbox meeting-card__checkbox--attendance"
              type="checkbox"
              checked={checkedValues.includes(itemKey)}
              onChange={() => toggleValue(setter, itemKey)}
            />
            <span>{item.name}</span>
          </label>
        );
      })}
    </div>
  );

  if (!isOpen) {
    return (
      <div
        className="meeting-card"
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        role="button"
        tabIndex={0}
      >
        <div className="meeting-card__left">
          <div className="meeting-card__top">
            <div className="meeting-card__main">
              <p className="meeting-card__time">
                {formatTime(meeting.startAt)} - {getEndTime(meeting.startAt)}
              </p>

              <h3
                className={`meeting-card__title ${getTitleSizeClass(meeting.teamName)}`}
              >
                {meeting.teamName}
              </h3>
            </div>

            <div className="meeting-card__meta">
              <a
                href="https://alfabank.ktalk.ru/projectpractice"
                className={`meeting-card__status meeting-card__status--${meeting.status}`}
                onClick={(event) => event.stopPropagation()}
              >
                {getStatusLabel(meeting.status)}
              </a>

              <p className="meeting-card__date">
                {formatDate(meeting.date)}
                <br />
                {formatWeekDay(meeting.date)}
              </p>
            </div>
          </div>

          <p className="meeting-card__case">{meeting.caseName}</p>
        </div>

        <div className="meeting-card__divider" />

        <div className="meeting-card__right">
          <p className="meeting-card__collapsed-participants-title">
            Участники
          </p>
          <div className="meeting-card__collapsed-participants-list">
            {meeting.participants?.length > 0
              ? meeting.participants.map((participant, index) => (
                  <div key={`${participant}-${index}`}>{participant}</div>
                ))
              : "Участники не добавлены"}
          </div>
        </div>
      </div>
    );
  }

  const openCardClasses = [
    "meeting-card",
    "meeting-card--open",
    isFullOpen ? "meeting-card--full" : "",
    saveStatus === "saved" || saveStatus === "error"
      ? "meeting-card--with-toast"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={openCardClasses}>
      <header className="meeting-card__open-header">
        <p className="meeting-card__open-time">
          {formatTime(meeting.startAt)} - {getEndTime(meeting.startAt)}
        </p>
        <h3 className="meeting-card__open-title">{meeting.teamName}</h3>
        <p className="meeting-card__open-date">{formatDate(meeting.date)}</p>
      </header>

      <p className="meeting-card__open-case">{meeting.caseName}</p>

      {(isDetailsLoading || detailsError) && (
        <p className="meeting-card__details-state">
          {isDetailsLoading ? "Загрузка данных встречи..." : detailsError}
        </p>
      )}

      <div
        className={
          isFullOpen ? "meeting-card__full-grid" : "meeting-card__open-grid"
        }
      >
        <section className="meeting-card__panel">
          <h4>Участники команды</h4>
          <div className="meeting-card__participant-list">
            {details.participants.map((participant) => (
              <div
                key={participant.id || participant.name}
                className="meeting-card__participant"
              >
                <span>{participant.name}</span>
                <small>{participant.role}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="meeting-card__panel meeting-card__panel--tasks">
          <h4>Задачи на этот созвон</h4>
          {renderTaskList()}
        </section>

        {isFullOpen && (
          <>
            <div className="meeting-card__past-title">
              Были на прошлом созвоне:
            </div>

            <section className="meeting-card__panel">
              <h4>Участники команды</h4>
              <div className="meeting-card__past-list">
                {details.previousParticipants.length > 0
                  ? details.previousParticipants.map((participant) => (
                      <span key={participant.id || participant.name}>
                        {participant.name}
                      </span>
                    ))
                  : "Участники не были отмечены"}
              </div>
            </section>

            <section className="meeting-card__panel">
              <h4>Менторы</h4>
              <div className="meeting-card__past-list">
                {details.previousMentors.length > 0
                  ? details.previousMentors.map((mentor) => (
                      <span key={mentor.id || mentor.name}>{mentor.name}</span>
                    ))
                  : "Менторы не были отмечены"}
              </div>
            </section>

            <section className="meeting-card__panel meeting-card__panel--comment">
              <h4>Комментарий</h4>
              <p>
                {details.comments.find(Boolean) || "Комментарий не добавлен"}
              </p>
            </section>
          </>
        )}
      </div>

      <button
        className="meeting-card__more-button"
        type="button"
        onClick={() => setIsFullOpen((currentValue) => !currentValue)}
      >
        {isFullOpen ? "Скрыть" : "Показать больше"}
        <img
          className="meeting-card__more-icon"
          src={showMoreIcon}
          alt=""
          aria-hidden="true"
        />
      </button>

      <p className="meeting-card__after-title">После встречи</p>
      <div className="meeting-card__separator" />

      <div className="meeting-card__after-grid">
        <section className="meeting-card__panel meeting-card__panel--after">
          <h4>Участники команды</h4>
          <p>Отметьте присутствующих</p>
          {renderAttendanceList(
            details.participants,
            presentParticipants,
            setPresentParticipants,
            "participant",
          )}
        </section>

        <section className="meeting-card__panel meeting-card__panel--field">
          <h4>Задачи на следующий созвон</h4>
          <textarea
            value={nextTaskText}
            onChange={(event) => setNextTaskText(event.target.value)}
            placeholder="Напишите задачи на следующий созвон"
          />
        </section>

        <section className="meeting-card__panel meeting-card__panel--after">
          <h4>Менторы</h4>
          <p>Отметьте присутствующих</p>
          {details.mentors.length > 0 ? (
            renderAttendanceList(
              details.mentors,
              presentMentors,
              setPresentMentors,
              "mentor",
            )
          ) : (
            <p className="meeting-card__empty-mentors">Менторы не добавлены</p>
          )}
        </section>

        <section className="meeting-card__panel meeting-card__panel--field meeting-card__panel--field-tall">
          <h4>Комментарий</h4>
          <textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder="Напишите отзыв о проведенном созвоне"
          />
        </section>
      </div>

      <div className="meeting-card__actions">
        <button
          className="meeting-card__save-button"
          type="button"
          disabled={saveStatus === "saving"}
          onClick={handleSave}
        >
          {saveStatus === "saving" ? "Сохраняем" : "Сохранить"}
        </button>
      </div>

      {(saveStatus === "saved" || saveStatus === "error") && (
        <div
          className={`meeting-card__toast meeting-card__toast--${saveStatus}`}
          role="status"
        >
          <button
            type="button"
            onClick={() => setSaveStatus("idle")}
            aria-label="Закрыть"
          >
            <img src={closeAlertIcon} alt="" aria-hidden="true" />
          </button>
          <strong>{saveStatus === "saved" ? "Успешно" : "Ошибка"}</strong>
          <span>
            {saveStatus === "saved"
              ? "Изменения сохранены"
              : "Не удалось сохранить изменения"}
          </span>
        </div>
      )}
    </article>
  );
}

export default MeetingCard;
