import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/Search.css";

import curatorIcon from "../assets/icons/curator.svg";
import projectIcon from "../assets/icons/project.svg";
import searchIcon from "../assets/icons/search.svg";
import showLessFiltersIcon from "../assets/icons/show_less_filters.svg";
import studentIcon from "../assets/icons/student.svg";
import teamIcon from "../assets/icons/team.svg";

const entityMap = {
  student: "member",
  curator: "curator",
  team: "team",
  project: "project",
  "project-idea": "project",
  "project-active": "project",
  "project-archive": "project",
};

const projectStatusByFilter = {
  "project-idea": "idea",
  "project-active": "active",
  "project-archive": "archive",
};

const entities = [
  { id: "student", label: "Студент" },
  { id: "curator", label: "Куратор" },
  { id: "team", label: "Команда" },
  { id: "project-idea", label: "Идея проекта" },
  { id: "project-active", label: "Проект в работе" },
  { id: "project-archive", label: "Проект в архиве" },
];

const entityLabels = {
  project: "Проект",
  team: "Команда",
  member: "Студент",
  curator: "Куратор",
};

const entityIcons = {
  project: projectIcon,
  team: teamIcon,
  member: studentIcon,
  curator: curatorIcon,
};

const projectStatuses = {
  idea: {
    label: "Идея",
    className: "finder-status--idea",
  },
  active: {
    label: "В работе",
    className: "finder-status--active",
  },
  archive: {
    label: "В архиве",
    className: "finder-status--archive",
  },
};

const getEntityTitle = (entity) => {
  if (entity.entityType === "member") {
    return [entity.surname, entity.name, entity.secondName].filter(Boolean).join(" ") || "Без имени";
  }

  return entity.name || entity.title || entity.surname || "Без названия";
};

const Finder = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isEntityFilterOpen, setIsEntityFilterOpen] = useState(true);

  const selectedProjectStatuses = useMemo(
    () =>
      selectedEntities
        .map((entity) => projectStatusByFilter[entity])
        .filter(Boolean),
    [selectedEntities],
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);

      try {
        const uniqueEntities = [
          ...new Set(selectedEntities.map((entity) => entityMap[entity])),
        ].filter(Boolean);

        if (uniqueEntities.length === 0) {
          uniqueEntities.push("member", "curator", "team", "project");
        }

        const allResults = await Promise.all(
          uniqueEntities.map((entity) => {
            const url = `/api/find/${entity}?query=${encodeURIComponent(debouncedQuery)}`;
            return fetch(url)
              .then((res) => res.json())
              .then((data) => ({ entity, data }));
          }),
        );

        if (cancelled) return;

        setResults(
          allResults.flatMap(({ entity, data }) =>
            data.map((item) => {
              const explicitStatus =
                entity === "project" && selectedProjectStatuses.length > 0
                  ? selectedProjectStatuses[0]
                  : null;

              return {
                ...item,
                entityType: entity,
                status: explicitStatus || item.status || (entity === "project" ? "active" : null),
              };
            }),
          ),
        );
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, selectedEntities, selectedProjectStatuses]);

  const handleEntityChange = (entity) => {
    setSelectedEntities((prev) =>
      prev.includes(entity)
        ? prev.filter((item) => item !== entity)
        : [...prev, entity],
    );
  };

  const openEntityCard = (result) => {
    if (result.entityType === "member") {
      navigate(`/finder/student/${result.id}`, { state: { student: result } });
    }
  };

  return (
    <div className="finder-page">
      <aside className="finder-filter-sidebar">
        <section className="finder-filter-section">
          <div className="finder-filter-heading">
            <span>Сущность</span>
            <button
              className="finder-filter-toggle"
              type="button"
              onClick={() => setIsEntityFilterOpen((value) => !value)}
              aria-expanded={isEntityFilterOpen}
              aria-label={isEntityFilterOpen ? "Скрыть фильтр сущности" : "Показать фильтр сущности"}
            >
              <img
                src={showLessFiltersIcon}
                alt=""
                className={`finder-filter-toggle__icon ${isEntityFilterOpen ? "is-open" : ""}`}
              />
            </button>
          </div>
          {isEntityFilterOpen && (
            <div className="finder-filter-options">
              {entities.map((entity) => (
                <label key={entity.id} className="finder-filter-option">
                  <input
                    type="checkbox"
                    checked={selectedEntities.includes(entity.id)}
                    onChange={() => handleEntityChange(entity.id)}
                  />
                  <span className="finder-checkbox" />
                  <span>{entity.label}</span>
                </label>
              ))}
            </div>
          )}
        </section>
      </aside>

      <section className="finder-content">
        <label className="finder-search">
          <img src={searchIcon} alt="" className="finder-search__icon" />
          <input
            type="text"
            placeholder="Поиск"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>

        {loading && <div className="finder-loading">Загрузка...</div>}

        <div className="finder-results">
          {results.map((result, index) => {
            const status = result.entityType === "project" ? projectStatuses[result.status] : null;
            const clickable = result.entityType === "member";

            return (
              <article
                key={`${result.entityType}-${result.id}-${index}`}
                className={`finder-card ${clickable ? "finder-card--clickable" : ""}`}
                onClick={() => clickable && openEntityCard(result)}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                onKeyDown={(event) => {
                  if (clickable && event.key === "Enter") openEntityCard(result);
                }}
              >
                <div className="finder-card__media">
                  {status && (
                    <span className={`finder-status ${status.className}`}>
                      <span className="finder-status__dot" />
                      <span>{status.label}</span>
                    </span>
                  )}
                  <img
                    src={entityIcons[result.entityType]}
                    alt=""
                    className="finder-card__icon"
                  />
                  <span className="finder-card__type">
                    {entityLabels[result.entityType] || result.entityType}
                  </span>
                </div>

                <h3 className="finder-card__title">{getEntityTitle(result)}</h3>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Finder;
