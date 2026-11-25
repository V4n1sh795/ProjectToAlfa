// Семестры: осенний 01.09–31.12, весенний 01.02–30.06. Всегда берём текущий или ближайший будущий,
// а не прошедший: с июля весенний семестр этого года уже закончился, поэтому он относится к следующему году.

const pad = (value) => String(value).padStart(2, "0");
const format = (day, month, year) => `${pad(day)}.${pad(month)}.${year}`;

/** Семестр по умолчанию: с января по июнь — весенний, с июля (каникулы) по декабрь — осенний. */
export function getDefaultSemester(now = new Date()) {
  return now.getMonth() + 1 <= 6 ? "spring" : "autumn";
}

/** Даты выбранного семестра в формате ДД.ММ.ГГГГ. */
export function getSemesterDates(semester, now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (semester === "autumn") {
    return { startDate: format(1, 9, year), endDate: format(31, 12, year) };
  }
  const springYear = month >= 7 ? year + 1 : year;
  return { startDate: format(1, 2, springYear), endDate: format(30, 6, springYear) };
}
