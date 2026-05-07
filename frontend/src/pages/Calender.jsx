import axios from "axios";
import { useState, useEffect } from "react";
import { authAPI } from "./js/LogIn";
import { redirect } from "react-router-dom";
import MeetingsList from "../components/MainPage/MeetingsList";
import MiniCalendar from "../components/MainPage/MiniCalendar";
import "./css/Calendar.css";

// Структура данных одной встречи
// id
// teamName
// case
// startAt
// participants: { id, fullName }[]

const mockData = [
  {
    id: 1,
    teamName: "MeSu",
    caseName:
      "Разработка MVP учетной системы для формирования счетов-фактур по доходным и НДС проводкам на продажи услуг банка",
    date: "2026-04-22",
    startAt: "10:00:00",
    status: "scheduled",
    participants: [
      { id: 1, fullName: "Иван Иванов" },
      { id: 2, fullName: "Петр Петров" },
      { id: 3, fullName: "Анна Смирнова" },
    ],
  },
  {
    id: 2,
    teamName: "MeSu ITC",
    caseName:
      "Разработка MVP учетной системы для формирования счетов-фактур по доходным и НДС проводкам на продажи услуг банка",
    date: "2026-05-22",
    startAt: "11:30:00",
    status: "finished",
    participants: [
      { id: 4, fullName: "Виталик Бутерин" },
      { id: 5, fullName: "Ванек Неруш" },
      { id: 6, fullName: "Тим Кук" },
    ],
  },
  {
    id: 3,
    teamName: "Шныри",
    caseName:
      "Разработка MVP учетной системы для формирования счетов-фактур по доходным и НДС проводкам на продажи услуг банка",
    date: "2026-05-22",
    startAt: "12:00:00",
    status: "scheduled",
    participants: [
      { id: 7, fullName: "Никита Андреевич Волков" },
      { id: 8, fullName: "Станислав Романович Орлов" },
      { id: 9, fullName: "Геннадий Павлович Киселев" },
    ],
  },
  {
    id: 4,
    teamName: "Frontend Ninjas",
    caseName:
      "Разработка MVP учетной системы для формирования счетов-фактур по доходным и НДС проводкам на продажи услуг банка",
    date: "2026-04-22",
    startAt: "12:30:00",
    status: "scheduled",
    participants: [
      { id: 10, fullName: "Алексей Викторович Морозов" },
      { id: 11, fullName: "Мария Ильинична Соколова" },
    ],
  },
  {
    id: 5,
    teamName: "Backend Masters",
    caseName:
      "Разработка MVP учетной системы для формирования счетов-фактур по доходным и НДС проводкам на продажи услуг банка",
    date: "2026-04-23",
    startAt: "09:00:00",
    status: "finished",
    participants: [{ id: 12, fullName: "Дмитрий Сергеевич Ковалев" }],
  },
  {
    id: 6,
    teamName: "QA Team",
    caseName:
      "Разработка MVP учетной системы для формирования счетов-фактур по доходным и НДС проводкам на продажи услуг банка",
    date: "2026-04-28",
    startAt: "15:00:00",
    status: "in_progress",
    participants: [],
  },
  {
    id: 7,
    teamName: "DevOps",
    caseName:
      "Разработка MVP учетной системы для формирования счетов-фактур по доходным и НДС проводкам на продажи услуг банка",
    date: "2026-04-22",
    startAt: "14:00:00",
    status: "finished",
    participants: [
      { id: 13, fullName: "Сергей Николаевич Егоров" },
      { id: 14, fullName: "Ольга Владимировна Титова" },
      { id: 15, fullName: "Елена Артемовна Белова" },
    ],
  },
];

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

function Calender() {
  const [selectedDate, setSelectedDate] = useState("2026-04-22");

  const weekStart = getWeekStart(selectedDate);
  const weekEnd = getWeekEnd(weekStart);

  const filteredMeetings = mockData
    .filter((meeting) => meeting.date >= weekStart && meeting.date <= weekEnd)
    .sort((m1, m2) =>
      m1.date !== m2.date
        ? m1.date.localeCompare(m2.date)
        : m1.startAt.localeCompare(m2.startAt),
    );

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
          <h1>На эту неделю встреч не запланировано</h1>
        ) : (
          <MeetingsList meetings={filteredMeetings} />
        )}
      </div>
    </div>
  );
}

export default Calender;
