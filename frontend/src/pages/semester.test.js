import { getDefaultSemester, getSemesterDates } from "./semester";

const on = (iso) => new Date(`${iso}T12:00:00`);

test("default semester follows the calendar and never points to a finished one", () => {
  expect(getDefaultSemester(on("2026-03-10"))).toBe("spring");
  expect(getDefaultSemester(on("2026-06-30"))).toBe("spring");
  expect(getDefaultSemester(on("2026-07-01"))).toBe("autumn");
  expect(getDefaultSemester(on("2026-08-20"))).toBe("autumn");
  expect(getDefaultSemester(on("2026-11-25"))).toBe("autumn");
});

test("autumn semester is always in the current year", () => {
  expect(getSemesterDates("autumn", on("2026-08-20"))).toEqual({ startDate: "01.09.2026", endDate: "31.12.2026" });
  expect(getSemesterDates("autumn", on("2026-11-25"))).toEqual({ startDate: "01.09.2026", endDate: "31.12.2026" });
});

test("spring semester moves to the next year once this year's spring is over", () => {
  expect(getSemesterDates("spring", on("2026-03-10"))).toEqual({ startDate: "01.02.2026", endDate: "30.06.2026" });
  expect(getSemesterDates("spring", on("2026-07-01"))).toEqual({ startDate: "01.02.2027", endDate: "30.06.2027" });
  expect(getSemesterDates("spring", on("2026-11-25"))).toEqual({ startDate: "01.02.2027", endDate: "30.06.2027" });
});
