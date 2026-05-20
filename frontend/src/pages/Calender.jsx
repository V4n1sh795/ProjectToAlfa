import { getMeetings } from "../api/meetingsApi";
import { useState, useEffect } from "react";
// import { authAPI } from "./js/LogIn";
// import { redirect } from "react-router-dom";
import MeetingsList from "../components/MainPage/MeetingsList";
import MiniCalendar from "../components/MainPage/MiniCalendar";
import "./css/Calendar.css";

function mapMeetingFromApi(meeting) {
  const teamName =
    meeting.teamName || `Команда ${meeting.teamId || "неизвестно"}`;
  const caseName = meeting.caseName || "Кейс не указан";
  const date = meeting.date?.slice(0, 10);
  const startAt = meeting.startAt || meeting.time;

  return {
    id: meeting.id,
    meetingKey: meeting.id || `${date}-${startAt}-${teamName}`,
    teamName,
    caseName,
    date,
    startAt,
    status: meeting.status || "scheduled",
    participants: meeting.participants || [],
  };
}

// В getWeekStart и getWeekEnd могут быть косяки с датой из-за toISOString
const getWeekStart = (date) => {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
};

const getWeekEnd = (weekStart) => {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
};

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

function Calender() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const weekStart = getWeekStart(selectedDate);
  const weekEnd = getWeekEnd(weekStart);

  useEffect(() => {
    async function loadMeetings() {
      setLoading(true);
      setError(null);

      try {
        const data = await getMeetings(weekStart);
        const preparedMeetings = data.map(mapMeetingFromApi);

        setMeetings(preparedMeetings);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadMeetings();
  }, [weekStart]);

  const filteredMeetings = meetings
    .filter((meeting) => meeting.date >= weekStart && meeting.date <= weekEnd)
    .sort((m1, m2) =>
      m1.date !== m2.date
        ? m1.date.localeCompare(m2.date)
        : (m1.startAt || "").localeCompare(m2.startAt || ""),
    );

  // if (loading) {
  //   return <div>Загрузка встреч...</div>;
  // }

  if (error) {
    return <div>Ошибка загрузки встреч: {error}</div>;
  }

  return (
    <div className="calendar-page">
      <div className="calendar-page__sidebar">
        <MiniCalendar
          selectedDate={selectedDate}
          selectedWeekStart={weekStart}
          selectedWeekEnd={weekEnd}
          onSelectDate={setSelectedDate}
        />
      </div>

      <div className="calendar-page__content">
        {filteredMeetings.length === 0 ? (
          <h1>На эту неделю встречи не запланированы</h1>
        ) : (
          <MeetingsList meetings={filteredMeetings} />
        )}
      </div>
    </div>
  );
}

export default Calender;
