import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/Search.css";

const entityMap = {
  student: "member",
  curator: "curator",
  team: "team",
  project: "project",
  "project-idea": "project",
  "project-pending": "project",
  "project-active": "project",
  "project-archive": "project",
};

const periods = [
  "2025/26 Весенний",
  "2025/26 Осенний",
  "2024/25 Весенний",
  "2024/25 Осенний",
];

const entities = [
  { id: "student", label: "Студент" },
  { id: "curator", label: "Куратор" },
  { id: "team", label: "Команда" },
  { id: "project-idea", label: "Идея проекта" },
  { id: "project-pending", label: "Проект на согласовании" },
  { id: "project-active", label: "Проект в работе" },
  { id: "project-archive", label: "Проект в архиве" },
];

const labels = {
  project: "Проект",
  team: "Команда",
  member: "Студент",
  curator: "Куратор",
};

const icons = {
  project: "📁",
  team: "👥",
  member: "👤",
  curator: "👨‍🏫",
};

const getStatusColor = (status) => {
  const colors = {
    idea: { bg: "#e3f2fd", text: "#1976d2" },
    pending: { bg: "#fff3e0", text: "#f57c00" },
    active: { bg: "#d4edda", text: "#155724" },
    archive: { bg: "#f5f5f5", text: "#666" },
  };

  return colors[status] || colors.active;
};

const getStatusLabel = (status) => {
  const statusLabels = {
    active: "В работе",
    pending: "На согласовании",
    idea: "Идея",
    archive: "В архиве",
  };

  return statusLabels[status] || status;
};

const Finder = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        const uniqueEntities = [
          ...new Set(selectedEntities.map((entity) => entityMap[entity])),
        ].filter(Boolean);

        if (uniqueEntities.length === 0) {
          uniqueEntities.push("project", "team", "member", "curator");
        }

        const allResults = await Promise.all(
          uniqueEntities.map((entity) => {
            const url = `api/find/${entity}?query=${encodeURIComponent(debouncedQuery)}`;
            return fetch(url)
              .then((res) => res.json())
              .then((data) => ({ entity, data }));
          }),
        );

        setResults(
          allResults.flatMap(({ entity, data }) =>
            data.map((item) => ({
              ...item,
              entityType: entity,
              period: selectedPeriods[0] || "current",
            })),
          ),
        );
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    if (debouncedQuery || selectedEntities.length > 0) {
      fetchData();
    } else {
      setResults([]);
    }
  }, [debouncedQuery, selectedEntities, selectedPeriods]);

  const handlePeriodChange = (period) => {
    setSelectedPeriods((prev) =>
      prev.includes(period)
        ? prev.filter((item) => item !== period)
        : [...prev, period],
    );
  };

  const handleEntityChange = (entity) => {
    setSelectedEntities((prev) =>
      prev.includes(entity)
        ? prev.filter((item) => item !== entity)
        : [...prev, entity],
    );
  };

  const resetFilters = () => {
    setSelectedPeriods([]);
    setSelectedEntities([]);
    setSearchQuery("");
    setResults([]);
  };

  const openEntityCard = (result) => {
    if (result.entityType === "member") {
      navigate(`/finder/student/${result.id}`, { state: { student: result } });
    }
  };

  return (
    <div className="search-container">
      <div className="search-input-wrapper">
        <svg
          className="search-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder=""
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="search-input"
        />
      </div>

      <div className="filters-wrapper">
        <div className="filter-section">
          <div className="filter-header">
            <span>Период</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <div className="filter-options">
            {periods.map((period) => (
              <label key={period} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedPeriods.includes(period)}
                  onChange={() => handlePeriodChange(period)}
                />
                <span className="checkmark" />
                {period}
              </label>
            ))}
            <label className="checkbox-label">
              <input type="checkbox" />
              <span className="checkmark" />
              ......
            </label>
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-header">
            <span>Сущность</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <div className="filter-options">
            {entities.map((entity) => (
              <label key={entity.id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedEntities.includes(entity.id)}
                  onChange={() => handleEntityChange(entity.id)}
                />
                <span className="checkmark" />
                {entity.label}
              </label>
            ))}
          </div>
        </div>

        <button className="reset-filters-btn" onClick={resetFilters}>
          Сбросить фильтры
        </button>
      </div>

      {loading && <div className="loading">Загрузка...</div>}

      <div className="results-container">
        {results.map((result, index) => {
          const status = result.status || (result.entityType === "project" ? "active" : null);
          const statusStyle = status ? getStatusColor(status) : null;
          const clickable = result.entityType === "member";

          return (
            <div
              key={`${result.entityType}-${result.id}-${index}`}
              className={`result-card ${clickable ? "clickable" : ""}`}
              onClick={() => clickable && openEntityCard(result)}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={(event) => {
                if (clickable && event.key === "Enter") openEntityCard(result);
              }}
            >
              {status && (
                <div className="result-status">
                  <span
                    className="status-badge"
                    style={{ background: statusStyle.bg, color: statusStyle.text }}
                  >
                    {getStatusLabel(status)}
                  </span>
                </div>
              )}
              <div className="result-icon">
                {icons[result.entityType] || "📄"}
              </div>
              <div className="result-content">
                <h3>
                  {result.name || result.surname || result.title || "Без названия"}
                  {result.entityType === "member" && result.secondName && (
                    <span className="name-secondary"> {result.secondName}</span>
                  )}
                </h3>
                {result.description && (
                  <p className="result-description">{result.description}</p>
                )}
                {result.email && <p className="result-meta">Email: {result.email}</p>}
                {result.group && <p className="result-meta">Группа: {result.group}</p>}
                <span className="result-type">{labels[result.entityType] || result.entityType}</span>
              </div>
              {clickable && (
                <svg
                  className="chevron-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Finder;
