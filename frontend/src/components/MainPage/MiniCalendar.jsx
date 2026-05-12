import { useState } from "react";
import "./MiniCalendar.css";

import arrowLeftIcon from "../../assets/icons/arrow_left.svg";
import arrowRightIcon from "../../assets/icons/arrow_right.svg";

const monthNames = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const getCalendarDays = (
  currentMonth,
  selectedDate,
  selectedWeekStart,
  selectedWeekEnd,
) => {
  const d = new Date(currentMonth);

  const year = d.getFullYear();
  const month = d.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const dayOfWeek = firstDayOfMonth.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const gridStart = new Date(firstDayOfMonth);
  gridStart.setDate(firstDayOfMonth.getDate() - diff);

  const days = [];

  for (let i = 0; i < 42; i++) {
    const current = new Date(gridStart);
    current.setDate(gridStart.getDate() + i);

    const dateString = formatDate(current);

    days.push({
      date: dateString,
      dayNumber: current.getDate(),
      isCurrentMonth: current.getMonth() === month,
      isSelected: dateString === selectedDate,
      isInSelectedWeek:
        dateString >= selectedWeekStart && dateString <= selectedWeekEnd,
    });
  }

  const visibleDays = [];

  for (let i = 0; i < days.length; i += 7) {
    const week = days.slice(i, i + 7);

    const hasCurrentMonthDay = week.some((day) => day.isCurrentMonth);

    if (hasCurrentMonthDay) {
      visibleDays.push(...week);
    }
  }

  return visibleDays;
};

const formatDate = (date) => {
  const d = new Date(date);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
};

function MiniCalendar({
  selectedDate,
  selectedWeekStart,
  selectedWeekEnd,
  onSelectDate,
}) {
  const [visibleMonth, setVisibleMonth] = useState(new Date(selectedDate));

  const handlePrevMonth = () => {
    const prev = new Date(visibleMonth);
    prev.setMonth(visibleMonth.getMonth() - 1);
    setVisibleMonth(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(visibleMonth);
    next.setMonth(visibleMonth.getMonth() + 1);
    setVisibleMonth(next);
  };

  const handleSelectDay = (day) => {
    onSelectDate(day.date);

    if (!day.isCurrentMonth) {
      setVisibleMonth(new Date(day.date));
    }
  };

  const calendarDays = getCalendarDays(
    visibleMonth,
    selectedDate,
    selectedWeekStart,
    selectedWeekEnd,
  );

  return (
    <div className="mini-calendar">
      <div className="calendar-header">
        <button onClick={() => handlePrevMonth()}>
          <img src={arrowLeftIcon} />
        </button>
        <h2>
          {monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
        </h2>
        <button onClick={() => handleNextMonth()}>
          <img src={arrowRightIcon} />
        </button>
      </div>

      <div className="calendar-weekdays">
        {weekDays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="calendar-grid">
        {calendarDays.map((day) => (
          <button
            key={day.date}
            className={`
              calendar-day
              ${day.isCurrentMonth ? "" : "calendar-day--muted"}
              ${day.isInSelectedWeek ? "calendar-day--week" : ""}
            `}
            onClick={() => handleSelectDay(day)}
          >
            {day.dayNumber}
          </button>
        ))}
      </div>
    </div>
  );
}

export default MiniCalendar;
