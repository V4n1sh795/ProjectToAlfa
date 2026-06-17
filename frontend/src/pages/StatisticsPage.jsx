import { useEffect, useMemo, useState } from "react";
import { getCuratorStatistics, getCurators } from "../api/meetingsApi";
import SelectDropdown from "../components/SelectDropdown";
import "./css/StatisticsPage.css";

const requiredMessage = "Заполните обязательное поле";

const getValue = (source, names, fallback = "") => {
  if (!source) return fallback;

  for (const name of names) {
    if (
      source[name] !== undefined &&
      source[name] !== null &&
      source[name] !== ""
    ) {
      return source[name];
    }
  }

  return fallback;
};

const normalizeCurators = (items) => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (typeof item === "string") {
        return { id: item, name: item };
      }

      return {
        id: getValue(item, ["id", "Id", "key", "Key"], null),
        name: getValue(
          item,
          ["name", "Name", "fullName", "FullName", "value", "Value"],
          "",
        ),
      };
    })
    .filter((curator) => curator.id !== null && curator.name);
};

const formatDateInput = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)} / ${digits.slice(2)}`;

  return `${digits.slice(0, 2)} / ${digits.slice(2, 4)} / ${digits.slice(4)}`;
};

const parseDateInput = (value) => {
  const match = value.match(/^(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));

  if (
    parsedDate.getFullYear() !== Number(year) ||
    parsedDate.getMonth() !== Number(month) - 1 ||
    parsedDate.getDate() !== Number(day)
  ) {
    return null;
  }

  return `${year}-${month}-${day}`;
};

const formatPeriodDate = (isoDate) => {
  const [year, month, day] = isoDate.split("-");
  return `${Number(day)}.${month}.${year}`;
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const normalizeStatistics = (data, selectedCurator, startDate, endDate) => {
  const source = (Array.isArray(data) ? data[0] : data) || {};
  const statisticsSource =
    source.statistics ?? source.Statistics ?? source.statistic ?? source;
  const curatorSource = source.curator ?? source.Curator ?? source;
  const curatorName = getValue(
    curatorSource,
    ["name", "Name", "curatorName", "CuratorName", "fullName", "FullName"],
    selectedCurator?.name || "",
  );

  return {
    curatorName,
    startDate,
    endDate,
    meetingsCount: toNumber(
      getValue(
        statisticsSource,
        [
          "meetingsCount",
          "MeetingsCount",
          "plannedMeetings",
          "PlannedMeetings",
          "totalMeetings",
          "TotalMeetings",
          "meetingCount",
          "MeetingCount",
        ],
        0,
      ),
    ),
    visitedMeetings: toNumber(
      getValue(
        statisticsSource,
        [
          "visitedMeetings",
          "VisitedMeetings",
          "attendedMeetings",
          "AttendedMeetings",
          "visitedCount",
          "VisitedCount",
          "attendedCount",
          "AttendedCount",
        ],
        0,
      ),
    ),
  };
};

const StatisticsPage = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [curatorId, setCuratorId] = useState("");
  const [curators, setCurators] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [statistics, setStatistics] = useState(null);
  const [isCuratorsLoading, setIsCuratorsLoading] = useState(false);
  const [isStatisticsLoading, setIsStatisticsLoading] = useState(false);

  const selectedCurator = useMemo(
    () => curators.find((curator) => String(curator.id) === String(curatorId)),
    [curatorId, curators],
  );

  useEffect(() => {
    let cancelled = false;

    const loadCurators = async () => {
      setIsCuratorsLoading(true);
      setLoadError("");

      try {
        const data = await getCurators();
        if (!cancelled) setCurators(normalizeCurators(data));
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error.response?.data?.message ||
              error.message ||
              "Не удалось загрузить список кураторов",
          );
        }
      } finally {
        if (!cancelled) setIsCuratorsLoading(false);
      }
    };

    loadCurators();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const closeDropdown = (event) => {
      if (event.target.closest?.(".statistics-curator-select")) return;
      setOpenDropdown(null);
    };

    document.addEventListener("mousedown", closeDropdown);
    return () => document.removeEventListener("mousedown", closeDropdown);
  }, []);

  const resetResult = () => {
    setStatistics(null);
    setRequestError("");
  };

  const handleDateChange = (setter) => (event) => {
    setter(formatDateInput(event.target.value));
    resetResult();
  };

  const validateForm = () => {
    const nextErrors = {};
    const parsedStartDate = parseDateInput(startDate);
    const parsedEndDate = parseDateInput(endDate);

    if (!startDate) {
      nextErrors.startDate = requiredMessage;
    } else if (!parsedStartDate) {
      nextErrors.startDate = "Введите дату в формате dd / mm / yyyy";
    }

    if (!endDate) {
      nextErrors.endDate = requiredMessage;
    } else if (!parsedEndDate) {
      nextErrors.endDate = "Введите дату в формате dd / mm / yyyy";
    }

    if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
      nextErrors.endDate = "Дата окончания не может быть раньше даты начала";
    }

    if (!curatorId) nextErrors.curatorId = requiredMessage;

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return null;

    return {
      startDate: parsedStartDate,
      endDate: parsedEndDate,
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const dates = validateForm();
    if (!dates || isStatisticsLoading) return;

    setIsStatisticsLoading(true);
    setRequestError("");
    setStatistics(null);

    try {
      const data = await getCuratorStatistics({
        curatorId,
        startDate: dates.startDate,
        endDate: dates.endDate,
      });
      setStatistics(
        normalizeStatistics(data, selectedCurator, dates.startDate, dates.endDate),
      );
    } catch (error) {
      setRequestError(
        error.response?.data?.message ||
          error.message ||
          "Не удалось получить статистику за выбранный период",
      );
    } finally {
      setIsStatisticsLoading(false);
    }
  };

  return (
    <section className="statistics-page">
      <h2>Статистика по кураторам</h2>

      <form className="statistics-panel" onSubmit={handleSubmit}>
        <div className="statistics-controls">
          <div className="statistics-dates">
            <label className="statistics-field">
              <span>
                Дата начала <b>*</b>
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={startDate}
                onChange={handleDateChange(setStartDate)}
                placeholder="dd / mm / yyyy"
                aria-invalid={Boolean(errors.startDate)}
              />
              {errors.startDate && (
                <small className="statistics-error">{errors.startDate}</small>
              )}
            </label>

            <label className="statistics-field">
              <span>
                Дата окончания <b>*</b>
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={endDate}
                onChange={handleDateChange(setEndDate)}
                placeholder="dd / mm / yyyy"
                aria-invalid={Boolean(errors.endDate)}
              />
              {errors.endDate && (
                <small className="statistics-error">{errors.endDate}</small>
              )}
            </label>
          </div>

          <div className="statistics-field statistics-curator-field">
            <span>
              Куратор <b>*</b>
            </span>
            <SelectDropdown
              id="statistics-curator"
              value={curatorId}
              options={curators}
              placeholder={
                isCuratorsLoading ? "Загрузка..." : "Выберите куратора"
              }
              isOpen={openDropdown === "curator"}
              classNamePrefix="statistics-curator-select"
              showHasValueClass
              onToggle={() =>
                setOpenDropdown((current) =>
                  current === "curator" ? null : "curator",
                )
              }
              onChange={(value) => {
                setCuratorId(value);
                setOpenDropdown(null);
                resetResult();
              }}
            />
            {(errors.curatorId || loadError) && (
              <small className="statistics-error">
                {errors.curatorId || loadError}
              </small>
            )}
          </div>
        </div>

        <div className="statistics-result">
          {statistics && (
            <p className="statistics-result-text">
              {statistics.curatorName} в период с{" "}
              {formatPeriodDate(statistics.startDate)} по{" "}
              {formatPeriodDate(statistics.endDate)} присутствовал на{" "}
              {statistics.visitedMeetings} из {statistics.meetingsCount}{" "}
              запланированных встречах.
            </p>
          )}

          {requestError && (
            <p className="statistics-request-error">{requestError}</p>
          )}

          <button
            className="statistics-submit"
            type="submit"
            disabled={isStatisticsLoading}
          >
            {isStatisticsLoading
              ? "Загрузка..."
              : "Узнать статистику за период"}
          </button>
        </div>
      </form>
    </section>
  );
};

export default StatisticsPage;
