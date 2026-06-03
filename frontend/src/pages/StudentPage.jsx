import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { updateMemberCard } from "../api/meetingsApi";
import "./css/StudentPage.css";
import UnsavedChangesAlert from "../components/UnsavedChangesAlert";
import editIcon from "../assets/icons/edit.svg";

const emptyValue = "Не указано";

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
  key: getValue(item, ["key", "Key", "id", "Id"], null),
  value: getValue(item, ["value", "Value", "name", "Name"], ""),
});

const normalizeList = (items) => {
  if (!Array.isArray(items)) return [];

  return items.map((item) => {
    if (typeof item === "string") {
      return { id: null, name: item };
    }

    const pair = normalizeKeyValue(item);
    return {
      id: pair.key,
      name: pair.value || emptyValue,
    };
  });
};

const getStudentProfiles = (student) => {
  const profiles = getValue(student, ["profiles", "Profiles"], null);
  if (Array.isArray(profiles)) return profiles;

  const duplicateIdProfiles = getValue(student, ["id", "Id"], null);
  return Array.isArray(duplicateIdProfiles) ? duplicateIdProfiles : [];
};

const parseProfile = (profile) => {
  if (typeof profile === "object" && profile !== null) {
    return {
      profileId: getValue(profile, ["profileId", "profileid", "ProfileId"], null),
      semesterTitle: getValue(
        profile,
        ["semesterTitle", "Semestr", "semestr", "semester", "Semester"],
        "",
      ),
      teamId: getValue(profile, ["teamid", "teamId", "TeamId"], null),
      teamName: getValue(profile, ["teamName", "TeamName"], ""),
      projectId: getValue(profile, ["projectId", "ProjectId"], null),
      projectName: getValue(profile, ["projectName", "ProjectName"], ""),
      role: getValue(profile, ["role", "Role"], emptyValue),
      stack: getValue(profile, ["stack", "Stack"], emptyValue),
      group: getValue(
        profile,
        ["groupNumber", "GroupNumber", "group"],
        emptyValue,
      ),
      comment: getValue(
        profile,
        ["comment", "Comment"],
        "",
      ),
    };
  }

  const parts = String(profile || "")
    .trim()
    .split(/\s+/);
  return {
    profileId: null,
    semesterTitle: "",
    teamId: null,
    teamName: "",
    projectId: null,
    projectName: "",
    role: parts[0] || emptyValue,
    stack: parts.slice(1, -1).join(" ") || emptyValue,
    group: parts[parts.length - 1] || emptyValue,
    comment: "",
  };
};

const formatSemester = (semester, index) => {
  if (!semester) return `Запись ${index + 1}`;

  const normalized = String(semester).trim();
  const yearMatch = normalized.match(/20\d{2}/);
  const year = yearMatch?.[0] || "";
  const lower = normalized.toLowerCase();

  if (lower.includes("вес")) return `Весенний семестр ${year}`.trim();
  if (lower.includes("ос")) return `Осенний семестр ${year}`.trim();

  return normalized;
};

const cloneCard = (card) => JSON.parse(JSON.stringify(card));

const normalizeOptionalId = (value) => {
  if (value === "" || value === null || value === undefined) return null;

  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? value : numericValue;
};

const createComparableStudentCard = (card) => {
  if (!card) return null;

  return {
    contact: String(card.contact || "").trim(),
    records: (card.records || []).map((record) => ({
      profileId: record.profileId ?? null,
      semesterTitle: String(record.semesterTitle || "").trim(),
      teamId: record.teamId ?? null,
      teamName: String(record.teamName || "").trim(),
      projectId: record.projectId ?? null,
      projectName: String(record.projectName || "").trim(),
      role: String(record.role || "").trim(),
      stack: String(record.stack || "").trim(),
      comment: String(record.comment || "").trim(),
    })),
  };
};

const StudentDropdown = ({
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
    <div className={`student-select ${isOpen ? "is-open" : ""}`}>
      <button
        className="student-select__button"
        type="button"
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedOption?.name || placeholder}</span>
        <span className="student-select__arrow" />
      </button>

      {isOpen && (
        <div className="student-select__menu" role="listbox">
          <button
            className={`student-select__option ${value ? "" : "is-selected"}`}
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => onChange("")}
          >
            {placeholder}
          </button>
          {options.map((option) => (
            <button
              className={`student-select__option ${
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

const StudentPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const initialStudent = location.state?.student;
  const [student, setStudent] = useState(initialStudent || null);
  const [team, setTeam] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(!initialStudent);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [savedCard, setSavedCard] = useState(null);
  const [draftCard, setDraftCard] = useState(null);
  const [teamOptions, setTeamOptions] = useState([]);
  const [projectOptions, setProjectOptions] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const cardRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const loadStudent = async () => {
      setLoading(true);
      setError("");

      try {
        const teamsRequest = fetch("/api/get_team").catch(() => null);
        const projectsRequest = fetch("/api/project").catch(() => null);
        const memberResponse = await fetch(`/api/member/${id}`);
        if (!memberResponse.ok) throw new Error("Студент не найден");
        const member = await memberResponse.json();
        if (cancelled) return;

        const [rawTeamsResponse, rawProjectsResponse] = await Promise.all([
          teamsRequest,
          projectsRequest,
        ]);
        const rawTeams = rawTeamsResponse?.ok ? await rawTeamsResponse.json() : [];
        const rawProjects = rawProjectsResponse?.ok
          ? await rawProjectsResponse.json()
          : [];

        if (!cancelled) {
          setTeamOptions(
            normalizeList(rawTeams).filter((team) => team.id !== null && team.name),
          );
          setProjectOptions(
            normalizeList(rawProjects).filter(
              (project) => project.id !== null && project.name,
            ),
          );
        }

        const teamId = getValue(
          member,
          ["team_id", "teamId", "Team_id", "TeamId"],
          null,
        );
        setStudent((prev) => ({
          ...member,
          ...prev,
          profiles: getStudentProfiles(member),
          teamname: getValue(member, ["teamname", "Teamname"], ""),
          team_id: teamId,
        }));

        if (!teamId) return;

        const teamResponse = await fetch(`/api/team/${teamId}`);
        const teamData = teamResponse.ok ? await teamResponse.json() : null;
        const rawTeam = rawTeams.find(
          (item) => String(getValue(item, ["id", "Id"])) === String(teamId),
        );
        const mergedTeam = { ...rawTeam, ...teamData };

        if (cancelled) return;
        setTeam(mergedTeam);

        const linkedProject = normalizeKeyValue(
          getValue(mergedTeam, ["project", "Project"], null),
        );
        const projectId =
          linkedProject.key ||
          getValue(mergedTeam, ["projectId", "ProjectId"], null);
        if (!projectId) return;

        const projectResponse = await fetch(`/api/project/${projectId}`);
        if (!projectResponse.ok) return;
        const projectData = await projectResponse.json();

        if (!cancelled) setProject(projectData);
      } catch (loadError) {
        if (!cancelled)
          setError(
            loadError.message || "Не удалось загрузить карточку студента",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadStudent();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!openDropdown) return undefined;

    const closeDropdown = (event) => {
      if (event.target.closest?.(".student-select")) return;
      setOpenDropdown(null);
    };

    document.addEventListener("mousedown", closeDropdown);
    return () => document.removeEventListener("mousedown", closeDropdown);
  }, [openDropdown]);

  const profiles = useMemo(() => {
    const rawProfiles = getStudentProfiles(student);
    if (!Array.isArray(rawProfiles) || rawProfiles.length === 0)
      return [parseProfile(null)];
    return rawProfiles.map(parseProfile);
  }, [student]);

  const fullName = useMemo(() => {
    const apiName = getValue(student, ["name", "Name"], "");
    const surname = getValue(student, ["surname", "Surname"], "");
    const secondName = getValue(student, ["secondName", "SecondName"], "");

    if (surname) return `${surname} ${apiName} ${secondName}`.trim();
    return apiName || "Студент";
  }, [student]);

  const projectName = getValue(project, ["name", "Name"], emptyValue);
  const linkedProject = normalizeKeyValue(getValue(team, ["project", "Project"], null));
  const projectId =
    linkedProject.key || getValue(team, ["projectId", "ProjectId"], null);
  const teamName =
    getValue(student, ["teamname", "Teamname"], "") ||
    getValue(team, ["name", "Name"], emptyValue);
  const teamId = getValue(student, ["team_id", "teamId", "Team_id", "TeamId"], null);
  const semester = getValue(project, ["semester", "Semester"], "");
  const technology = getValue(
    project,
    ["technology", "Technology"],
    emptyValue,
  );
  const contact = getValue(
    student,
    ["contact", "Contact", "conntacts", "contacts", "email", "Email", "phone", "Phone"],
    "",
  );

  const cardData = useMemo(
    () =>
      savedCard || {
        contact,
        records: profiles.map((profile, index) => ({
          profileId: profile.profileId,
          semesterTitle: formatSemester(profile.semesterTitle || semester, index),
          teamId: profile.teamId ?? teamId,
          teamName: profile.teamName || teamName,
          projectId: profile.projectId ?? projectId,
          projectName: profile.projectName || projectName,
          role: profile.role,
          stack: profile.stack || technology,
          comment: profile.comment,
        })),
      },
    [
      contact,
      profiles,
      projectId,
      projectName,
      savedCard,
      semester,
      teamId,
      teamName,
      technology,
    ],
  );

  const hasUnsavedChanges = useMemo(() => {
    if (!isEditing || !draftCard) return false;

    return (
      JSON.stringify(createComparableStudentCard(draftCard)) !==
      JSON.stringify(createComparableStudentCard(cardData))
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
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraftCard(cloneCard(cardData));
    setOpenDropdown(null);
    setActiveModal(null);
    setPendingNavigation(null);
    setIsEditing(false);
  };

  const updateDraft = (field, value, recordIndex = null) => {
    setDraftCard((prev) => {
      if (recordIndex === null) {
        return { ...prev, [field]: value };
      }

      return {
        ...prev,
        records: prev.records.map((record, index) =>
          index === recordIndex ? { ...record, [field]: value } : record,
        ),
      };
    });
  };

  const updateRecordOption = (field, optionField, options, value, recordIndex) => {
    const selectedOption = options.find((option) => String(option.id) === String(value));

    setDraftCard((prev) => ({
      ...prev,
      records: prev.records.map((record, index) =>
        index === recordIndex
          ? {
              ...record,
              [field]: selectedOption?.id ?? null,
              [optionField]: selectedOption?.name || "",
            }
          : record,
      ),
    }));
    setOpenDropdown(null);
  };

  const getSelectOptions = (records, currentRecordIndex, field, options) => {
    const selectedIds = new Set(
      records
        .map((record, index) =>
          index === currentRecordIndex || record[field] === null
            ? null
            : String(record[field]),
        )
        .filter(Boolean),
    );

    return options.filter((option) => !selectedIds.has(String(option.id)));
  };

  const buildStudentPatchPayload = (card) => ({
    id: normalizeOptionalId(id),
    contact: String(card.contact || "").trim(),
    profiles: card.records.map((record) => ({
      profileId: normalizeOptionalId(record.profileId),
      semesterTitle: String(record.semesterTitle || "").trim(),
      teamid: normalizeOptionalId(record.teamId),
      teamName: String(record.teamName || "").trim(),
      projectId: normalizeOptionalId(record.projectId),
      projectName: String(record.projectName || "").trim(),
      role: String(record.role || "").trim(),
      stack: String(record.stack || "").trim(),
      comment: String(record.comment || "").trim(),
    })),
  });

  const commitDraft = async () => {
    if (!draftCard || isSaving) return;

    const payload = buildStudentPatchPayload(draftCard);

    setIsSaving(true);
    setSaveError("");

    try {
      let updatedMember = null;

      try {
        updatedMember = await updateMemberCard(id, payload);
      } catch (apiError) {
        const endpointIsMissing =
          apiError.response?.status === 404;

        if (!endpointIsMissing) throw apiError;
        console.warn("Member update endpoint is not ready yet.", {
          payload,
          error: apiError,
        });
      }

      setSavedCard(cloneCard(draftCard));
      if (updatedMember) setStudent((prev) => ({ ...prev, ...updatedMember }));
      const navigationTarget = pendingNavigation;
      setPendingNavigation(null);
      setActiveModal(null);
      setIsEditing(false);
      if (navigationTarget) navigate(navigationTarget);
    } catch (saveDraftError) {
      setSaveError(
        saveDraftError.response?.data?.message ||
          saveDraftError.message ||
          "Не удалось сохранить изменения студента",
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
    return <div className="student-page-state">Загрузка...</div>;
  }

  if (error) {
    return <div className="student-page-state">{error}</div>;
  }

  return (
    <div className="student-page">
      <article
        className={`student-card ${isEditing ? "student-card-editing" : ""}`}
        ref={cardRef}
      >
        <h1>{fullName}</h1>

        {isEditing && draftCard ? (
          <form className="student-edit-form" onSubmit={saveDraft}>
            <label className="student-edit-field">
              <span>Контакты</span>
              <input
                value={draftCard.contact}
                onChange={(event) => updateDraft("contact", event.target.value)}
              />
            </label>

            {draftCard.records.map((record, index) => (
              <section
                className="student-record student-record-edit"
                key={`${record.semesterTitle}-${index}`}
              >
                <h2>{record.semesterTitle}</h2>

                <div className="student-record-divider" />

                <label className="student-edit-field">
                  <span>Участник команды</span>
                  <StudentDropdown
                    id={`team-${index}`}
                    value={record.teamId ?? ""}
                    options={getSelectOptions(
                      draftCard.records,
                      index,
                      "teamId",
                      teamOptions,
                    )}
                    placeholder="Выберите команду"
                    isOpen={openDropdown === `team-${index}`}
                    onToggle={() =>
                      setOpenDropdown((current) =>
                        current === `team-${index}` ? null : `team-${index}`,
                      )
                    }
                    onChange={(value) =>
                      updateRecordOption(
                        "teamId",
                        "teamName",
                        teamOptions,
                        value,
                        index,
                      )
                    }
                  />
                </label>

                <label className="student-edit-field">
                  <span>Проект</span>
                  <StudentDropdown
                    id={`project-${index}`}
                    value={record.projectId ?? ""}
                    options={getSelectOptions(
                      draftCard.records,
                      index,
                      "projectId",
                      projectOptions,
                    )}
                    placeholder="Выберите проект"
                    isOpen={openDropdown === `project-${index}`}
                    onToggle={() =>
                      setOpenDropdown((current) =>
                        current === `project-${index}` ? null : `project-${index}`,
                      )
                    }
                    onChange={(value) =>
                      updateRecordOption(
                        "projectId",
                        "projectName",
                        projectOptions,
                        value,
                        index,
                      )
                    }
                  />
                </label>

                <label className="student-edit-field">
                  <span>Роль</span>
                  <input
                    value={record.role}
                    onChange={(event) =>
                      updateDraft("role", event.target.value, index)
                    }
                  />
                </label>

                <label className="student-edit-field">
                  <span>Стек</span>
                  <input
                    value={record.stack}
                    onChange={(event) =>
                      updateDraft("stack", event.target.value, index)
                    }
                  />
                </label>

                <label className="student-edit-field">
                  <span>Комментарий</span>
                  <input
                    value={record.comment}
                    onChange={(event) =>
                      updateDraft("comment", event.target.value, index)
                    }
                  />
                </label>
              </section>
            ))}

            {saveError && <p className="student-save-error">{saveError}</p>}

            <div className="student-edit-actions">
              <button
                className="student-cancel-button"
                type="button"
                onClick={cancelEditing}
                disabled={isSaving}
              >
                Отменить изменения
              </button>
              <button className="student-save-button" type="submit" disabled={isSaving}>
                {isSaving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <section className="student-info-block">
              <span>Контакты</span>
              <strong>{cardData.contact}</strong>
            </section>

            {cardData.records.map((record, index) => (
              <section
                className="student-record"
                key={`${record.role}-${index}`}
              >
                <h2>{record.semesterTitle}</h2>

                <div className="student-record-divider" />

                <div className="student-info-block">
                  <span>Участник команды</span>
                  <strong>{record.teamName}</strong>
                </div>

                <div className="student-info-block">
                  <span>Проект</span>
                  <strong>{record.projectName}</strong>
                </div>

                <div className="student-info-block">
                  <span>Роль</span>
                  <strong>{record.role}</strong>
                </div>

                <div className="student-info-block">
                  <span>Стек</span>
                  <strong>{record.stack}</strong>
                </div>

                <div className="student-info-block">
                  <span>Комментарий</span>
                  <strong>{record.comment}</strong>
                </div>
              </section>
            ))}

            <button
              className="student-edit-button"
              type="button"
              onClick={startEditing}
            >
              Редактировать
              <img src={editIcon} alt="" className="student-edit-icon" />
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
              disabled={isSaving}
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

export default StudentPage;
