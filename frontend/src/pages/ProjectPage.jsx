import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  getCurators,
  getProject,
  getTeams,
  updateProjectCard,
} from "../api/meetingsApi";
import "./css/ProjectPage.css";
import closeAlertIcon from "../assets/icons/close_alert.svg";
import editIcon from "../assets/icons/edit.svg";

const statusOptions = [
  {
    id: "idea",
    label: "Идея",
    modalTitle: "Опишите, почему вы хотите вернуть проект в идеи",
    modalButton: "Вернуть в идеи",
  },
  {
    id: "active",
    label: "В работе",
    modalTitle: "Опишите, почему вы хотите переместить проект в работу",
    modalButton: "Переместить в работу",
  },
  {
    id: "archive",
    label: "Архив",
    modalTitle: "Опишите, почему вы хотите переместить проект в архив",
    modalButton: "Переместить в архив",
  },
];

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

const normalizeStatus = (status) => {
  const normalized = String(status || "").trim().toLowerCase();

  if (["idea", "идея"].includes(normalized)) return "idea";
  if (["archive", "archived", "архив", "в архиве"].includes(normalized)) {
    return "archive";
  }

  return "active";
};

const normalizeKeyValue = (item) => {
  if (typeof item === "string") return { id: null, name: item };
  if (typeof item === "number") return { id: item, name: String(item) };

  return {
    id: getValue(item, ["key", "Key", "id", "Id"], null),
    name: getValue(item, ["value", "Value", "name", "Name"], ""),
  };
};

const normalizeList = (items) => {
  if (!Array.isArray(items)) return [];

  return items.map((item) => {
    const pair = normalizeKeyValue(item);
    return {
      id: pair.id,
      name: pair.name || "",
    };
  });
};

const formatDate = (value) => {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(rawValue)) return rawValue;

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return rawValue;

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const formatSemester = (value) => {
  const rawValue = String(value || "").trim();
  const normalized = rawValue.toLowerCase();

  if (!rawValue) return "";
  if (["spring", "весенний"].includes(normalized) || normalized.includes("вес")) {
    return "Весенний";
  }
  if (["autumn", "fall", "осенний"].includes(normalized) || normalized.includes("ос")) {
    return "Осенний";
  }

  return rawValue;
};

const createProjectCard = (project, routeId) => {
  const curators = normalizeList(
    getValue(project, ["curators", "Curators"], []),
  );
  const curatorIds = normalizeList(
    getValue(project, ["curatorIds", "CuratorIds", "curator_ids", "Curator_ids"], []),
  );

  return {
    id: getValue(project, ["id", "Id"], routeId),
    name: getValue(project, ["name", "Name"], ""),
    description: getValue(project, ["description", "Description"], ""),
    goal: getValue(
      project,
      ["main_Goal", "Main_Goal", "mainGoal", "MainGoal", "goal", "Goal"],
      "",
    ),
    result: getValue(
      project,
      ["results", "Results", "result", "Result"],
      "",
    ),
    roles: getValue(project, ["roles", "Roles"], ""),
    technology: getValue(
      project,
      ["technology", "Technology", "keyTechnology", "KeyTechnology"],
      "",
    ),
    semester: formatSemester(getValue(project, ["semester", "Semester"], "")),
    startDate: formatDate(getValue(project, ["startDate", "StartDate"], "")),
    endDate: formatDate(getValue(project, ["endDate", "EndDate"], "")),
    teams: normalizeList(getValue(project, ["teams", "Teams"], [])),
    curators: curators.length > 0 ? curators : curatorIds,
    status: normalizeStatus(getValue(project, ["status", "Status"], "active")),
    statusReason: getValue(
      project,
      ["statusReason", "StatusReason", "archiveReason", "ArchiveReason"],
      "",
    ),
    archiveReason: getValue(project, ["archiveReason", "ArchiveReason"], ""),
  };
};

const cloneCard = (card) => JSON.parse(JSON.stringify(card));

const createComparableProjectCard = (card) => {
  if (!card) return null;

  return {
    name: String(card.name || "").trim(),
    description: String(card.description || "").trim(),
    goal: String(card.goal || "").trim(),
    result: String(card.result || "").trim(),
    roles: String(card.roles || "").trim(),
    technology: String(card.technology || "").trim(),
    semester: String(card.semester || "").trim(),
    startDate: String(card.startDate || "").trim(),
    endDate: String(card.endDate || "").trim(),
    status: card.status || "active",
    statusReason: String(card.statusReason || "").trim(),
    archiveReason: String(card.archiveReason || "").trim(),
    teams: (card.teams || []).map((team) => ({
      id: team.id ?? null,
      name: String(team.name || "").trim(),
    })),
    curators: (card.curators || []).map((curator) => ({
      id: curator.id ?? null,
      name: String(curator.name || "").trim(),
    })),
  };
};

const ProjectStatus = ({ status, isEditing, onChange }) => (
  <div className={`project-status ${isEditing ? "project-status--editable" : ""}`}>
    {statusOptions.map((option, index) => {
      const isActive = status === option.id;
      const content = (
        <>
          <span className="project-status__marker">
            <span className="project-status__inner" />
          </span>
          <span>{option.label}</span>
        </>
      );

      return (
        <div
          className={`project-status__item ${isActive ? "is-active" : ""}`}
          key={option.id}
        >
          {isEditing ? (
            <button
              className="project-status__button"
              type="button"
              onClick={() => onChange(option.id)}
            >
              {content}
            </button>
          ) : (
            <div className="project-status__button">{content}</div>
          )}
          {index < statusOptions.length - 1 && (
            <span className="project-status__line" />
          )}
        </div>
      );
    })}
  </div>
);

const ProjectAlert = ({ children, onClose, className = "" }) => (
  <div className="project-alert-backdrop">
    <section className={`project-alert ${className}`}>
      <button
        className="project-alert__close"
        type="button"
        onClick={onClose}
        aria-label="Закрыть"
      >
        <img src={closeAlertIcon} alt="" />
      </button>
      {children}
    </section>
  </div>
);

const ProjectDropdown = ({
  id,
  value,
  options,
  placeholder,
  isOpen,
  onChange,
  onToggle,
}) => {
  const selectedOption = options.find((option) => String(option.id) === String(value));

  return (
    <div className={`project-select ${isOpen ? "is-open" : ""}`}>
      <button
        className="project-select__button"
        type="button"
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedOption?.name || placeholder}</span>
        <span className="project-select__arrow" />
      </button>

      {isOpen && (
        <div className="project-select__menu" role="listbox">
          <button
            className={`project-select__option ${value ? "" : "is-selected"}`}
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => onChange("")}
          >
            {placeholder}
          </button>
          {options.map((option) => (
            <button
              className={`project-select__option ${
                String(option.id) === String(value) ? "is-selected" : ""
              }`}
              key={`${id}-${option.id}`}
              type="button"
              role="option"
              aria-selected={String(option.id) === String(value)}
              onClick={() => onChange(String(option.id))}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ProjectPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const initialProject = location.state?.project;

  const [project, setProject] = useState(initialProject || null);
  const [loading, setLoading] = useState(!initialProject);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [savedCard, setSavedCard] = useState(null);
  const [draftCard, setDraftCard] = useState(null);
  const [teamOptions, setTeamOptions] = useState([]);
  const [curatorOptions, setCuratorOptions] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [statusReason, setStatusReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const cardRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const loadProject = async () => {
      setLoading(true);
      setError("");

      try {
        const [projectData, teamsData, curatorsData] = await Promise.all([
          getProject(id),
          getTeams().catch(() => []),
          getCurators().catch(() => []),
        ]);
        if (!cancelled) setProject({ ...initialProject, ...projectData });
        if (!cancelled) {
          setTeamOptions(normalizeList(teamsData).filter((team) => team.id !== null && team.name));
          setCuratorOptions(
            normalizeList(curatorsData).filter(
              (curator) => curator.id !== null && curator.name,
            ),
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError.response?.data?.message ||
              loadError.message ||
              "Не удалось загрузить карточку проекта",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProject();

    return () => {
      cancelled = true;
    };
  }, [id, initialProject]);

  useEffect(() => {
    if (!openDropdown) return undefined;

    const closeDropdown = (event) => {
      if (event.target.closest?.(".project-select")) return;
      setOpenDropdown(null);
    };

    document.addEventListener("mousedown", closeDropdown);
    return () => document.removeEventListener("mousedown", closeDropdown);
  }, [openDropdown]);

  const cardData = useMemo(
    () => savedCard || createProjectCard(project, id),
    [id, project, savedCard],
  );

  const hasUnsavedChanges = useMemo(() => {
    if (!isEditing || !draftCard) return false;

    return (
      JSON.stringify(createComparableProjectCard(draftCard)) !==
      JSON.stringify(createComparableProjectCard(cardData))
    );
  }, [cardData, draftCard, isEditing]);

  useEffect(() => {
    if (!isEditing) return undefined;

    const showExitAlert = () => {
      if (!hasUnsavedChanges) return false;
      if (!activeModal) setActiveModal("exit");
      return true;
    };

    const handleClick = (event) => {
      if (activeModal || cardRef.current?.contains(event.target)) return;

      const link = event.target.closest?.("a[href]");
      if (!link) return;

      if (!hasUnsavedChanges) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      const href = link.getAttribute("href");
      if (href && !href.startsWith("#")) {
        const url = new URL(link.href, window.location.origin);
        setPendingNavigation(`${url.pathname}${url.search}${url.hash}`);
      }

      showExitAlert();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) showExitAlert();
    };

    const handleWindowBlur = () => {
      showExitAlert();
    };

    const handleBeforeUnload = (event) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [activeModal, hasUnsavedChanges, isEditing]);

  const startEditing = () => {
    setDraftCard(cloneCard(cardData));
    setSaveError("");
    setIsEditing(true);
  };

  const updateDraft = (field, value) => {
    setDraftCard((prev) => ({ ...prev, [field]: value }));
  };

  const updateListItem = (listName, index, value, options) => {
    const selectedOption = options.find((option) => String(option.id) === value);

    setDraftCard((prev) => ({
      ...prev,
      [listName]: prev[listName].map((item, itemIndex) =>
        itemIndex === index
          ? {
              id: selectedOption?.id ?? null,
              name: selectedOption?.name || "",
            }
          : item,
      ),
    }));
    setOpenDropdown(null);
  };

  const addListItem = (listName) => {
    setDraftCard((prev) => ({
      ...prev,
      [listName]: [...prev[listName], { id: null, name: "" }],
    }));
  };

  const removeListItem = (listName, index) => {
    setDraftCard((prev) => ({
      ...prev,
      [listName]: prev[listName].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const getSelectOptions = (selectedItems, currentItemId, options) => {
    const selectedIds = new Set(
      selectedItems
        .map((item) => (item.id === null ? null : String(item.id)))
        .filter((itemId) => itemId && itemId !== String(currentItemId)),
    );

    return options.filter((option) => !selectedIds.has(String(option.id)));
  };

  const changeStatus = (nextStatus) => {
    if (!draftCard || draftCard.status === nextStatus) return;

    setDraftCard((prev) => ({ ...prev, status: nextStatus }));

    if (nextStatus === "archive") {
      setPendingStatus(nextStatus);
      setStatusReason("");
      setActiveModal("status");
      return;
    }

    setPendingStatus(null);
    setStatusReason("");
  };

  const confirmStatusChange = () => {
    setDraftCard((prev) => ({
      ...prev,
      statusReason: statusReason.trim(),
      archiveReason:
        pendingStatus === "archive" ? statusReason.trim() : prev.archiveReason,
    }));
    setActiveModal(null);
    setPendingStatus(null);
    setStatusReason("");
  };

  const buildProjectPatchPayload = (card) => ({
    id: card.id,
    name: String(card.name || "").trim(),
    description: String(card.description || "").trim(),
    Main_Goal: String(card.goal || "").trim(),
    Results: String(card.result || "").trim(),
    Roles: String(card.roles || "").trim(),
    Technology: String(card.technology || "").trim(),
    startDate: String(card.startDate || "").trim(),
    endDate: String(card.endDate || "").trim(),
    semester: String(card.semester || "").trim(),
    status: card.status,
    statusReason: String(card.statusReason || "").trim(),
    archiveReason: String(card.archiveReason || "").trim(),
    teams: card.teams.map((team) => ({
      id: team.id,
      name: String(team.name || "").trim(),
    })),
    curators: card.curators.map((curator) => ({
      id: curator.id,
      name: String(curator.name || "").trim(),
    })),
  });

  const commitDraft = async () => {
    if (!draftCard || isSaving) return;

    const payload = buildProjectPatchPayload(draftCard);
    const nextCard = {
      ...draftCard,
      description: payload.description,
      goal: payload.Main_Goal,
      result: payload.Results,
      roles: payload.Roles,
      technology: payload.Technology,
      statusReason: payload.statusReason,
      archiveReason: payload.archiveReason,
      teams: payload.teams,
      curators: payload.curators,
    };

    setIsSaving(true);
    setSaveError("");

    try {
      let updatedProject = null;

      try {
        updatedProject = await updateProjectCard(id, payload);
      } catch (apiError) {
        const endpointIsMissing = [404, 405, 501].includes(
          apiError.response?.status,
        );

        if (!endpointIsMissing) throw apiError;
        console.warn("Project update endpoint is not ready yet.", apiError);
      }

      setSavedCard(nextCard);
      if (updatedProject) setProject((prev) => ({ ...prev, ...updatedProject }));
      const navigationTarget = pendingNavigation;
      setPendingNavigation(null);
      setActiveModal(null);
      setIsEditing(false);
      if (navigationTarget) navigate(navigationTarget);
    } catch (saveDraftError) {
      setSaveError(
        saveDraftError.response?.data?.message ||
          saveDraftError.message ||
          "Не удалось сохранить изменения проекта",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const saveDraft = async (event) => {
    event.preventDefault();
    await commitDraft();
  };

  const closeModal = () => {
    setActiveModal(null);
    setPendingStatus(null);
    setPendingNavigation(null);
    setStatusReason("");
  };

  if (loading) {
    return <div className="project-page-state">Загрузка...</div>;
  }

  if (error) {
    return <div className="project-page-state">{error}</div>;
  }

  return (
    <div className="project-page">
      <article
        className={`project-card ${isEditing ? "project-card-editing" : ""}`}
        ref={cardRef}
      >
        <header className="project-header">
          <h1>{cardData.name}</h1>
          <ProjectStatus
            status={isEditing && draftCard ? draftCard.status : cardData.status}
            isEditing={isEditing}
            onChange={changeStatus}
          />
        </header>

        <div className="project-divider project-divider--after-header" />

        <section className="project-meta">
          <span>Семестр: {cardData.semester}</span>
          <span>
            Даты проведения: <strong>{cardData.startDate} - {cardData.endDate}</strong>
          </span>
        </section>

        <div className="project-divider project-divider--after-meta" />

        {isEditing && draftCard ? (
          <form className="project-edit-form" onSubmit={saveDraft}>
            <label className="project-edit-field">
              <span>Описание проекта</span>
              <textarea
                className="project-edit-textarea project-edit-textarea--large"
                value={draftCard.description}
                onChange={(event) => updateDraft("description", event.target.value)}
              />
            </label>

            <label className="project-edit-field">
              <span>Цель проекта</span>
              <textarea
                className="project-edit-textarea"
                value={draftCard.goal}
                onChange={(event) => updateDraft("goal", event.target.value)}
              />
            </label>

            <label className="project-edit-field">
              <span>Результат проекта</span>
              <textarea
                className="project-edit-textarea"
                value={draftCard.result}
                onChange={(event) => updateDraft("result", event.target.value)}
              />
            </label>

            <label className="project-edit-field">
              <span>Роли в проекте</span>
              <input
                type="text"
                value={draftCard.roles}
                onChange={(event) => updateDraft("roles", event.target.value)}
              />
            </label>

            <label className="project-edit-field">
              <span>Ключевая технология</span>
              <input
                type="text"
                value={draftCard.technology}
                onChange={(event) => updateDraft("technology", event.target.value)}
              />
            </label>

            <div className="project-divider project-divider--in-form" />

            <div className="project-edit-grid">
              <section className="project-edit-list">
                <h2>Записанные команды</h2>
                {draftCard.teams.map((team, index) => (
                  <div className="project-edit-row" key={`team-${team.id ?? index}`}>
                    <ProjectDropdown
                      id={`team-${index}`}
                      value={team.id ?? ""}
                      options={getSelectOptions(draftCard.teams, team.id, teamOptions)}
                      placeholder="Выберите команду"
                      isOpen={openDropdown === `team-${index}`}
                      onToggle={() =>
                        setOpenDropdown((current) =>
                          current === `team-${index}` ? null : `team-${index}`,
                        )
                      }
                      onChange={(value) =>
                        updateListItem("teams", index, value, teamOptions)
                      }
                    />
                    <button
                      className="project-remove-button"
                      type="button"
                      onClick={() => removeListItem("teams", index)}
                      aria-label="Удалить команду"
                    />
                  </div>
                ))}
                <button
                  className="project-add-button"
                  type="button"
                  onClick={() => addListItem("teams")}
                >
                  + Добавить команду
                </button>
              </section>

              <section className="project-edit-list">
                <h2>Ответственные кураторы</h2>
                {draftCard.curators.map((curator, index) => (
                  <div
                    className="project-edit-row"
                    key={`curator-${curator.id ?? index}`}
                  >
                    <ProjectDropdown
                      id={`curator-${index}`}
                      value={curator.id ?? ""}
                      options={getSelectOptions(
                        draftCard.curators,
                        curator.id,
                        curatorOptions,
                      )}
                      placeholder="Выберите куратора"
                      isOpen={openDropdown === `curator-${index}`}
                      onToggle={() =>
                        setOpenDropdown((current) =>
                          current === `curator-${index}`
                            ? null
                            : `curator-${index}`,
                        )
                      }
                      onChange={(value) =>
                        updateListItem("curators", index, value, curatorOptions)
                      }
                    />
                    <button
                      className="project-remove-button"
                      type="button"
                      onClick={() => removeListItem("curators", index)}
                      aria-label="Удалить куратора"
                    />
                  </div>
                ))}
                <button
                  className="project-add-button"
                  type="button"
                  onClick={() => addListItem("curators")}
                >
                  + Добавить куратора
                </button>
              </section>
            </div>

            {saveError && <p className="project-save-error">{saveError}</p>}

            <div className="project-edit-actions">
              <button
                className="project-delete-button"
                type="button"
                onClick={() => setActiveModal("delete")}
              >
                Удалить проект
              </button>
              <button
                className="project-save-button"
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </form>
        ) : (
          <>
            {cardData.status === "archive" && cardData.archiveReason && (
              <section className="project-info-block project-info-block--reason">
                <span>Причина перемещения проекта в архив</span>
                <strong>{cardData.archiveReason}</strong>
              </section>
            )}

            <section className="project-info-block">
              <span>Описание проекта</span>
              <strong>{cardData.description}</strong>
            </section>

            <section className="project-info-block">
              <span>Цель проекта</span>
              <strong>{cardData.goal}</strong>
            </section>

            <section className="project-info-block">
              <span>Результат проекта</span>
              <strong>{cardData.result}</strong>
            </section>

            <section className="project-info-block">
              <span>Роли в проекте</span>
              <strong>{cardData.roles}</strong>
            </section>

            <section className="project-info-block">
              <span>Ключевая технология</span>
              <strong>{cardData.technology}</strong>
            </section>

            <div className="project-divider project-divider--before-lists" />

            <div className="project-summary-grid">
              <section className="project-summary-list">
                <h2>Записанные команды</h2>
                {cardData.teams.length > 0 ? (
                  cardData.teams.map((team, index) => (
                    <strong key={`${team.id ?? team.name}-${index}`}>
                      {team.name || ""}
                    </strong>
                  ))
                ) : (
                  <strong />
                )}
              </section>

              <section className="project-summary-list">
                <h2>Ответственные кураторы</h2>
                {cardData.curators.length > 0 ? (
                  cardData.curators.map((curator, index) => (
                    <strong key={`${curator.id ?? curator.name}-${index}`}>
                      {curator.name || ""}
                    </strong>
                  ))
                ) : (
                  <strong />
                )}
              </section>
            </div>

            <button
              className="project-edit-button"
              type="button"
              onClick={startEditing}
            >
              Редактировать
              <img src={editIcon} alt="" className="project-edit-icon" />
            </button>
          </>
        )}
      </article>

      {activeModal === "status" && (
        <ProjectAlert onClose={closeModal}>
          <h2>
            {statusOptions.find((option) => option.id === pendingStatus)?.modalTitle}
          </h2>
          <input
            className="project-alert-input"
            type="text"
            placeholder="Введите текст"
            value={statusReason}
            onChange={(event) => setStatusReason(event.target.value)}
          />
          <button
            className="project-alert-red-button project-alert-red-button--status"
            type="button"
            onClick={confirmStatusChange}
          >
            {statusOptions.find((option) => option.id === pendingStatus)?.modalButton}
          </button>
        </ProjectAlert>
      )}

      {activeModal === "exit" && (
        <ProjectAlert onClose={closeModal} className="project-alert--exit">
          <h2>Вы хотите сохранить изменения?</h2>
          <div className="project-alert-actions project-alert-actions--exit">
            <button
              className="project-alert-red-button project-alert-red-button--cancel"
              type="button"
              onClick={closeModal}
            >
              Отмена
            </button>
            <button
              className="project-alert-green-button"
              type="button"
              onClick={commitDraft}
              disabled={isSaving}
            >
              Сохранить
            </button>
          </div>
        </ProjectAlert>
      )}

      {activeModal === "delete" && (
        <ProjectAlert onClose={closeModal} className="project-alert--delete">
          <h2>Вы уверены, что хотите безвозвратно удалить проект?</h2>
          <button
            className="project-alert-red-button project-alert-red-button--confirm"
            type="button"
            onClick={closeModal}
          >
            Подтвердить
          </button>
        </ProjectAlert>
      )}
    </div>
  );
};

export default ProjectPage;
