import ParticipantsList from "./ParticipantsList";
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

const formatTime = (time) => {
  if (!time) return "--:--";
  return time.slice(0, 5);
};

const getEndTime = (startAt) => {
  if (!startAt) return "--:--";
  const d = new Date(`2000-01-01T${startAt}`);
  d.setMinutes(d.getMinutes() + 30);
  return d.toTimeString().slice(0, 8);
};

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getDate()} ${monthNames[d.getMonth()]}`;
};

const formatWeekDay = (date) => {
  const weekDays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

  const d = new Date(date);

  return weekDays[d.getDay()];
};

const getStatusLabel = (status) => {
  return statusLabels[status] || status;
};

const getTitleSizeClass = (title) => {
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

function MeetingCard({ meeting }) {
  return (
    <div className="meeting-card">
      <div className="meeting-card__left">
        <div className="meeting-card__top">
          <div className="meeting-card__main">
            <p className="meeting-card__time">
              {formatTime(meeting.startAt)} -{" "}
              {formatTime(getEndTime(meeting.startAt))}
            </p>

            <h3
              className={`meeting-card__title ${getTitleSizeClass(meeting.teamName)}`}
            >
              {meeting.teamName}
            </h3>
          </div>

          <div className="meeting-card__meta">
            <a
              href="#"
              className={`meeting-card__status meeting-card__status--${meeting.status}`}
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
        <ParticipantsList participants={meeting.participants} />
      </div>
    </div>
  );
}

export default MeetingCard;
