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
  return time.slice(0, 5);
};

const getEndTime = (startAt) => {
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

function MeetingCard({ meeting }) {
  return (
    <div className="meeting-card">
      <div className="meeting-card__left">
        <div className="meeting-card__main">
          <p className="meeting-card__time">
            {formatTime(meeting.startAt)} -{" "}
            {formatTime(getEndTime(meeting.startAt))}
          </p>

          <h3 className="meeting-card__title">{meeting.teamName}</h3>

          <p className="meeting-card__case">{meeting.caseName}</p>
        </div>

        <div className="meeting-card__meta">
          <span
            className={`meeting-card__status meeting-card__status--${meeting.status}`}
          >
            {getStatusLabel(meeting.status)}
          </span>

          <p className="meeting-card__date">
            {formatDate(meeting.date)} {formatWeekDay(meeting.date)}
          </p>
        </div>
      </div>

      <div className="meeting-card__divider" />

      <div className="meeting-card__right">
        <ParticipantsList participants={meeting.participants} />
      </div>
    </div>
  );
}

export default MeetingCard;
