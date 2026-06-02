import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getCurators, updateTeamCard } from "../api/meetingsApi";
import "./css/TeamPage.css";
import UnsavedChangesAlert from "../components/UnsavedChangesAlert";
import editIcon from "../assets/icons/edit.svg";

const emptyValue = "Не указано";

const dayLabels = {
  Monday: "Понедельник",
  Tuesday: "Вторник",
  Wednesday: "Среда",
  Thursday: "Четверг",
  Friday: "Пятница",
  Saturday: "Суббота",
  Sunday: "Воскресенье",
};

const dayOptions = Object.entries(dayLabels).map(([id, name]) => ({ id, name }));

const dayValuesByLabel = Object.entries(dayLabels).reduce(
  (result, [value, label]) => ({ ...result, [label.toLowerCase()]: value }),
  {},
);

const buildTimeOptions = () => {
  const options = [];

  for (let hour = 8; hour <= 20; hour += 1) {
    ["00", "30"].forEach((minutes) => {
      if (hour === 20 && minutes === "30") return;
      const time = `${String(hour).padStart(2, "0")}:${minutes}`;
      options.push({ id: time, name: time });
    });
  }

  return options;
};

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

const normalizeKeyValue = (item) => ({
  key: getValue(item, ["key", "Key"], null),
  value: getValue(item, ["value", "Value"], ""),
});

const normalizeList = (items) => {
  if (!Array.isArray(items)) return [];

  return items.map((item) => {
    if (typeof item === "string") {
      return { id: null, name: item };
    }

    const pair = normalizeKeyValue(item);
    return {
      id: pair.key || getValue(item, ["id", "Id"], null),
      name: pair.value || getValue(item, ["name", "Name"], ""),
    };
  });
};

const getFirstComment = (source) => {
  const comment = getValue(source, ["comment", "Comment"], "");
  if (comment) return comment;

  const comments = getValue(source, ["comments", "Comments"], []);
  if (Array.isArray(comments)) return comments.find(Boolean) || "";
  return String(comments || "");
};

const getProfileRole = (member) => {
  const profiles = getValue(member, ["profiles", "Profiles"], []);
  if (!Array.isArray(profiles) || profiles.length === 0) return "";

  const profile = profiles[0];
  if (typeof profile === "object" && profile !== null) {
    return getValue(profile, ["role", "Role"], "");
  }

  return String(profile || "").trim().split(/\s+/)[0] || "";
};

const getDayLabel = (value) => dayLabels[value] || value || emptyValue;

const getDayValue = (value) => {
  const normalizedValue = String(value || "").trim();
  return dayValuesByLabel[normalizedValue.toLowerCase()] || normalizedValue;
};

const getTimeValue = (value) => {
  const normalizedValue = String(value || "").trim();
  return normalizedValue === emptyValue ? "" : normalizedValue.slice(0, 5);
};

const createDraftMember = (member) => ({
  id: member.id ?? null,
  name: member.name || "",
  role: member.role || "",
});

const createDraftCurator = (curator) => ({
  id: curator.id ?? null,
  name: curator.name || "",
});

const cloneCard = (card) => JSON.parse(JSON.stringify(card));

const createComparableTeamCard = (card) => {
  if (!card) return null;

  return {
    projectId: card.projectId ?? null,
    projectName: String(card.projectName || "").trim(),
    callDay: card.callDay || getDayValue(card.meetingDay),
    meetingTime: String(card.meetingTime || "").trim(),
    artifacts: String(card.artifacts || "").trim(),
    members: (card.members || []).map((member) => ({
      id: member.id ?? null,
      name: String(member.name || "").trim(),
      role: String(member.role || "").trim(),
    })),
    curators: (card.curators || []).map((curator) => ({
      id: curator.id ?? null,
      name: String(curator.name || "").trim(),
    })),
    grades: {
      checkpoint1: String(card.grades?.checkpoint1 || "").trim(),
      checkpoint2: String(card.grades?.checkpoint2 || "").trim(),
      checkpoint3: String(card.grades?.checkpoint3 || "").trim(),
      final: String(card.grades?.final || "").trim(),
    },
    comment: String(card.comment || "").trim(),
  };
};

const TeamDropdown = ({
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
    <div className={`team-select ${isOpen ? "is-open" : ""}`}>
      <button
        className="team-select__button"
        type="button"
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedOption?.name || placeholder}</span>
        <span className="team-select__arrow" />
      </button>

      {isOpen && (
        <div className="team-select__menu" role="listbox">
          <button
            className={`team-select__option ${value ? "" : "is-selected"}`}
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => onChange("")}
          >
            {placeholder}
          </button>
          {options.map((option) => (
            <button
              className={`team-select__option ${
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

const TeamPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const initialTeam = location.state?.team;
  const [team, setTeam] = useState(initialTeam || null);
  const [project, setProject] = useState(null);
  const [memberDetails, setMemberDetails] = useState([]);
  const [loading, setLoading] = useState(!initialTeam);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [savedCard, setSavedCard] = useState(null);
  const [draftCard, setDraftCard] = useState(null);
  const [curatorOptions, setCuratorOptions] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const cardRef = useRef(null);
  const timeOptions = useMemo(() => buildTimeOptions(), []);

  useEffect(() => {
    let cancelled = false;

    const loadTeam = async () => {
      setLoading(true);
      setError("");

      try {
        const curatorOptionsRequest = getCurators().catch(() => []);
        const teamResponse = await fetch(`/api/team/${id}`);
        if (!teamResponse.ok) throw new Error("Команда не найдена");
        const teamData = await teamResponse.json();
        if (cancelled) return;

        const mergedTeam = { ...initialTeam, ...teamData };
        setTeam(mergedTeam);

        const linkedProject = normalizeKeyValue(
          getValue(mergedTeam, ["project", "Project"], null),
        );
        const projectId =
          linkedProject.key || getValue(mergedTeam, ["projectId", "ProjectId"], null);

        const members = normalizeList(
          getValue(mergedTeam, ["members", "Members"], []),
        );

        const loadedMembers = await Promise.all(
          members.map(async (member) => {
            if (!member.id) return { ...member, role: "" };

            try {
              const memberResponse = await fetch(`/api/member/${member.id}`);
              if (!memberResponse.ok) return { ...member, role: "" };
              const memberData = await memberResponse.json();
              return {
                ...member,
                name: member.name || getValue(memberData, ["name", "Name"], ""),
                role: getProfileRole(memberData),
              };
            } catch {
              return { ...member, role: "" };
            }
          }),
        );

        if (!cancelled) setMemberDetails(loadedMembers);
        const curatorsData = await curatorOptionsRequest;
        if (!cancelled) {
          setCuratorOptions(
            normalizeList(curatorsData).filter(
              (curator) => curator.id !== null && curator.name,
            ),
          );
        }

        if (!projectId) return;

        const projectResponse = await fetch(`/api/project/${projectId}`);
        if (!projectResponse.ok) return;
        const projectData = await projectResponse.json();

        if (!cancelled) setProject(projectData);
      } catch (loadError) {
        if (!cancelled)
          setError(
            loadError.message || "Не удалось загрузить карточку команды",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadTeam();

    return () => {
      cancelled = true;
    };
  }, [id, initialTeam]);

  useEffect(() => {
    if (!openDropdown) return undefined;

    const closeDropdown = (event) => {
      if (event.target.closest?.(".team-select")) return;
      setOpenDropdown(null);
    };

    document.addEventListener("mousedown", closeDropdown);
    return () => document.removeEventListener("mousedown", closeDropdown);
  }, [openDropdown]);

  const teamName = getValue(team, ["name", "Name"], "Команда");
  const linkedProject = normalizeKeyValue(getValue(team, ["project", "Project"], null));
  const projectId =
    linkedProject.key || getValue(team, ["projectId", "ProjectId"], null);
  const projectName =
    linkedProject.value ||
    getValue(project, ["name", "Name"], emptyValue);
  const callDay = getValue(team, ["callDay", "CallDay"], "");
  const meetingDay = getDayLabel(callDay);
  const meetingTime = getValue(team, ["callTime", "CallTime"], emptyValue);
  const artifacts = getValue(
    project,
    ["artifacts", "Artifacts", "artifact", "Artifact"],
    "",
  );
  const curators = normalizeList(getValue(team, ["curators", "Curators"], []));
  const comment = getFirstComment(team);

  const cardData = useMemo(
    () =>
      savedCard || {
        teamId: id,
        projectId,
        projectName,
        callDay,
        meetingDay,
        meetingTime,
        artifacts,
        members: memberDetails.map(createDraftMember),
        curators: curators.map(createDraftCurator),
        grades: {
          checkpoint1: "",
          checkpoint2: "",
          checkpoint3: "",
          final: "",
        },
        comment,
      },
    [
      artifacts,
      callDay,
      comment,
      curators,
      id,
      meetingDay,
      meetingTime,
      memberDetails,
      projectId,
      projectName,
      savedCard,
    ],
  );

  const hasUnsavedChanges = useMemo(() => {
    if (!isEditing || !draftCard) return false;

    return (
      JSON.stringify(createComparableTeamCard(draftCard)) !==
      JSON.stringify(createComparableTeamCard(cardData))
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

  const cancelEditing = () => {
    setDraftCard(cloneCard(cardData));
    setSaveError("");
    setOpenDropdown(null);
    setActiveModal(null);
    setPendingNavigation(null);
    setIsEditing(false);
  };

  const updateDraft = (field, value) => {
    setDraftCard((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "meetingDay" ? { callDay: getDayValue(value) } : {}),
    }));
  };

  const updateMeetingDay = (value) => {
    setDraftCard((prev) => ({
      ...prev,
      callDay: value,
      meetingDay: getDayLabel(value),
    }));
    setOpenDropdown(null);
  };

  const updateMember = (index, field, value) => {
    setDraftCard((prev) => ({
      ...prev,
      members: prev.members.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [field]: value } : member,
      ),
    }));
  };

  const addMember = () => {
    setDraftCard((prev) => ({
      ...prev,
      members: [...prev.members, { id: null, name: "", role: "" }],
    }));
  };

  const removeMember = (index) => {
    setDraftCard((prev) => ({
      ...prev,
      members: prev.members.filter((_, memberIndex) => memberIndex !== index),
    }));
  };

  const updateCurator = (index, value) => {
    const selectedOption = curatorOptions.find(
      (option) => String(option.id) === String(value),
    );

    setDraftCard((prev) => ({
      ...prev,
      curators: prev.curators.map((curator, curatorIndex) =>
        curatorIndex === index
          ? {
              id: selectedOption?.id ?? null,
              name: selectedOption?.name || "",
            }
          : curator,
      ),
    }));
    setOpenDropdown(null);
  };

  const addCurator = () => {
    setDraftCard((prev) => ({
      ...prev,
      curators: [...prev.curators, { id: null, name: "" }],
    }));
  };

  const removeCurator = (index) => {
    setDraftCard((prev) => ({
      ...prev,
      curators: prev.curators.filter((_, curatorIndex) => curatorIndex !== index),
    }));
  };

  const getCuratorSelectOptions = (selectedCurators, currentCuratorId) => {
    const selectedIds = new Set(
      selectedCurators
        .map((curator) => (curator.id === null ? null : String(curator.id)))
        .filter(
          (curatorId) => curatorId && curatorId !== String(currentCuratorId),
        ),
    );

    return curatorOptions.filter((curator) => !selectedIds.has(String(curator.id)));
  };

  const updateGrade = (field, value) => {
    setDraftCard((prev) => ({
      ...prev,
      grades: { ...prev.grades, [field]: value },
    }));
  };

  const buildTeamPatchPayload = (card) => ({
    id,
    project: {
      id: card.projectId,
      name: String(card.projectName || "").trim(),
      artifacts: String(card.artifacts || "").trim(),
    },
    callDay: card.callDay || getDayValue(card.meetingDay),
    callTime: String(card.meetingTime || "").trim(),
    members: card.members.map((member) => ({
      id: member.id,
      name: String(member.name || "").trim(),
      role: String(member.role || "").trim(),
    })),
    curators: card.curators.map((curator) => ({
      id: curator.id,
      name: String(curator.name || "").trim(),
    })),
    grades: {
      checkpoint1: String(card.grades.checkpoint1 || "").trim(),
      checkpoint2: String(card.grades.checkpoint2 || "").trim(),
      checkpoint3: String(card.grades.checkpoint3 || "").trim(),
      final: String(card.grades.final || "").trim(),
    },
    comment: String(card.comment || "").trim(),
  });

  const commitDraft = async () => {
    if (!draftCard || isSaving) return;

    const payload = buildTeamPatchPayload(draftCard);

    setIsSaving(true);
    setSaveError("");

    try {
      const updatedTeam = await updateTeamCard(id, payload);
      const nextCard = {
        ...draftCard,
        callDay: payload.callDay,
        meetingDay: getDayLabel(payload.callDay),
        members: payload.members,
        curators: payload.curators,
        grades: payload.grades,
        comment: payload.comment,
      };

      setSavedCard(nextCard);
      if (updatedTeam) setTeam((prev) => ({ ...prev, ...updatedTeam }));
      const navigationTarget = pendingNavigation;
      setPendingNavigation(null);
      setActiveModal(null);
      setIsEditing(false);
      if (navigationTarget) navigate(navigationTarget);
    } catch (saveError) {
      setSaveError(
        saveError.response?.data?.message ||
          saveError.message ||
          "Не удалось сохранить изменения команды",
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
    setPendingNavigation(null);
  };

  if (loading) {
    return <div className="team-page-state">Загрузка...</div>;
  }

  if (error) {
    return <div className="team-page-state">{error}</div>;
  }

  return (
    <div className="team-page">
      <article
        className={`team-card ${isEditing ? "team-card-editing" : ""}`}
        ref={cardRef}
      >
        <h1>{teamName}</h1>

        {isEditing && draftCard ? (
          <form className="team-edit-form" onSubmit={saveDraft}>
            <label className="team-edit-field team-edit-field--wide">
              <span>Название проекта</span>
              <input
                type="text"
                value={draftCard.projectName}
                onChange={(event) => updateDraft("projectName", event.target.value)}
              />
            </label>

            <div className="team-edit-grid">
              <label className="team-edit-field">
                <span>День встречи</span>
                <TeamDropdown
                  id="meeting-day"
                  value={draftCard.callDay || getDayValue(draftCard.meetingDay)}
                  options={dayOptions}
                  placeholder="Выберите день"
                  isOpen={openDropdown === "meeting-day"}
                  onToggle={() =>
                    setOpenDropdown((current) =>
                      current === "meeting-day" ? null : "meeting-day",
                    )
                  }
                  onChange={updateMeetingDay}
                />
              </label>

              <label className="team-edit-field">
                <span>Время начала встречи</span>
                <TeamDropdown
                  id="meeting-time"
                  value={getTimeValue(draftCard.meetingTime)}
                  options={timeOptions}
                  placeholder="Выберите время"
                  isOpen={openDropdown === "meeting-time"}
                  onToggle={() =>
                    setOpenDropdown((current) =>
                      current === "meeting-time" ? null : "meeting-time",
                    )
                  }
                  onChange={(value) => {
                    updateDraft("meetingTime", value);
                    setOpenDropdown(null);
                  }}
                />
              </label>
            </div>

            <label className="team-edit-field team-edit-field--wide">
              <span>Артефакты</span>
              <input
                type="text"
                value={draftCard.artifacts}
                onChange={(event) => updateDraft("artifacts", event.target.value)}
              />
            </label>

            <div className="team-edit-grid team-edit-grid--members">
              <section className="team-edit-list">
                <h2>Участники команды</h2>
                {draftCard.members.map((member, index) => (
                  <input
                    key={`member-${index}`}
                    type="text"
                    value={member.name}
                    onChange={(event) =>
                      updateMember(index, "name", event.target.value)
                    }
                  />
                ))}
                <button
                  className="team-add-button"
                  type="button"
                  onClick={addMember}
                >
                  + Добавить участника
                </button>
              </section>

              <section className="team-edit-list">
                <h2>Роли участников</h2>
                {draftCard.members.map((member, index) => (
                  <div className="team-edit-row" key={`role-${index}`}>
                    <input
                      type="text"
                      value={member.role}
                      onChange={(event) =>
                        updateMember(index, "role", event.target.value)
                      }
                    />
                    <button
                      className="team-remove-button"
                      type="button"
                      onClick={() => removeMember(index)}
                      aria-label="Удалить участника"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </section>
            </div>

            <div className="team-edit-grid team-edit-grid--bottom">
              <section className="team-edit-list">
                <h2>Кураторы команды</h2>
                {draftCard.curators.map((curator, index) => (
                  <div className="team-edit-row" key={`curator-${curator.id ?? index}`}>
                    <TeamDropdown
                      id={`curator-${index}`}
                      value={curator.id ?? ""}
                      options={getCuratorSelectOptions(
                        draftCard.curators,
                        curator.id,
                      )}
                      placeholder="Выберите куратора"
                      isOpen={openDropdown === `curator-${index}`}
                      onToggle={() =>
                        setOpenDropdown((current) =>
                          current === `curator-${index}` ? null : `curator-${index}`,
                        )
                      }
                      onChange={(value) => updateCurator(index, value)}
                    />
                    <button
                      className="team-remove-button"
                      type="button"
                      onClick={() => removeCurator(index)}
                      aria-label="Удалить куратора"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  className="team-add-button"
                  type="button"
                  onClick={addCurator}
                >
                  + Добавить куратора
                </button>
              </section>

              <section className="team-grade-editor">
                <label>
                  <span>1 контрольная точка -</span>
                  <input
                    type="text"
                    value={draftCard.grades.checkpoint1}
                    onChange={(event) => updateGrade("checkpoint1", event.target.value)}
                  />
                </label>
                <label>
                  <span>2 контрольная точка -</span>
                  <input
                    type="text"
                    value={draftCard.grades.checkpoint2}
                    onChange={(event) => updateGrade("checkpoint2", event.target.value)}
                  />
                </label>
                <label>
                  <span>3 контрольная точка -</span>
                  <input
                    type="text"
                    value={draftCard.grades.checkpoint3}
                    onChange={(event) => updateGrade("checkpoint3", event.target.value)}
                  />
                </label>
                <label>
                  <span>Итоговая оценка -</span>
                  <input
                    type="text"
                    value={draftCard.grades.final}
                    onChange={(event) => updateGrade("final", event.target.value)}
                  />
                </label>
              </section>
            </div>

            <label className="team-edit-field team-edit-field--wide">
              <span>Комментарий</span>
              <input
                type="text"
                value={draftCard.comment}
                onChange={(event) => updateDraft("comment", event.target.value)}
              />
            </label>

            {saveError && <p className="team-save-error">{saveError}</p>}

            <div className="team-edit-actions">
              <button
                className="team-cancel-button"
                type="button"
                onClick={cancelEditing}
                disabled={isSaving}
              >
                Отменить изменения
              </button>
              <button className="team-save-button" type="submit" disabled={isSaving}>
                Сохранить
              </button>
            </div>
          </form>
        ) : (
          <>
            <section className="team-info-block">
              <span>Название проекта</span>
              <strong>{cardData.projectName}</strong>
            </section>

            <section className="team-info-block team-info-block--split">
              <div>
                <span>День встречи</span>
                <strong>{cardData.meetingDay}</strong>
              </div>
              <div>
                <span>Время встречи</span>
                <strong>{cardData.meetingTime}</strong>
              </div>
            </section>

            <section className="team-info-block">
              <span>Артефакты</span>
              {String(cardData.artifacts).startsWith("http") ? (
                <a href={cardData.artifacts}>{cardData.artifacts}</a>
              ) : (
                <strong>{cardData.artifacts}</strong>
              )}
            </section>

            <section className="team-info-block team-info-block--split team-info-block--members">
              <div>
                <span>Участники команды</span>
                {cardData.members.map((member, index) => (
                  <strong key={`${member.name}-${index}`}>{member.name}</strong>
                ))}
              </div>
              <div>
                <span>Роли участников</span>
                {cardData.members.map((member, index) => (
                  <strong key={`${member.role}-${index}`}>
                    {member.role || emptyValue}
                  </strong>
                ))}
              </div>
            </section>

            <section className="team-info-block">
              <span>Кураторы команды</span>
              {cardData.curators.length > 0 ? (
                cardData.curators.map((curator, index) => (
                  <strong key={`${curator.id ?? curator.name}-${index}`}>
                    {curator.name || emptyValue}
                  </strong>
                ))
              ) : (
                <strong>{emptyValue}</strong>
              )}
            </section>

            <div className="team-summary-grid">
              <section className="team-info-block team-info-block--grades">
                <strong>
                  1 контрольная точка - {cardData.grades.checkpoint1}
                </strong>
                <strong>
                  2 контрольная точка - {cardData.grades.checkpoint2}
                </strong>
                <strong>
                  3 контрольная точка - {cardData.grades.checkpoint3}
                </strong>
                <strong>Итоговая оценка - {cardData.grades.final}</strong>
              </section>

              <section className="team-info-block team-info-block--comment">
                <span>Комментарий</span>
                <strong>{cardData.comment}</strong>
              </section>
            </div>

            <button
              className="team-edit-button"
              type="button"
              onClick={startEditing}
            >
              Редактировать
              <img src={editIcon} alt="" className="team-edit-icon" />
            </button>
          </>
        )}
      </article>

      {activeModal === "exit" && (
        <UnsavedChangesAlert onClose={closeModal}>
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
        </UnsavedChangesAlert>
      )}
    </div>
  );
};

export default TeamPage;
