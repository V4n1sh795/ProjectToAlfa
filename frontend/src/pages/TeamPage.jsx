import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { updateTeamCard } from "../api/meetingsApi";
import "./css/TeamPage.css";
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

const dayValuesByLabel = Object.entries(dayLabels).reduce(
  (result, [value, label]) => ({ ...result, [label.toLowerCase()]: value }),
  {},
);

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

const createDraftMember = (member) => ({
  id: member.id ?? null,
  name: member.name || "",
  role: member.role || "",
});

const createDraftCurator = (curator) => ({
  id: curator.id ?? null,
  name: curator.name || "",
});

const TeamPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const initialTeam = location.state?.team;
  const [team, setTeam] = useState(initialTeam || null);
  const [project, setProject] = useState(null);
  const [memberDetails, setMemberDetails] = useState([]);
  const [loading, setLoading] = useState(!initialTeam);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [savedCard, setSavedCard] = useState(null);
  const [draftCard, setDraftCard] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadTeam = async () => {
      setLoading(true);
      setError("");

      try {
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

  const startEditing = () => {
    setDraftCard(JSON.parse(JSON.stringify(cardData)));
    setSaveError("");
    setIsEditing(true);
  };

  const updateDraft = (field, value) => {
    setDraftCard((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "meetingDay" ? { callDay: getDayValue(value) } : {}),
    }));
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
    setDraftCard((prev) => ({
      ...prev,
      curators: prev.curators.map((curator, curatorIndex) =>
        curatorIndex === index ? { ...curator, name: value } : curator,
      ),
    }));
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

  const saveDraft = async (event) => {
    event.preventDefault();
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
      setIsEditing(false);
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

  if (loading) {
    return <div className="team-page-state">Загрузка...</div>;
  }

  if (error) {
    return <div className="team-page-state">{error}</div>;
  }

  return (
    <div className="team-page">
      <article className={`team-card ${isEditing ? "team-card-editing" : ""}`}>
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
                <input
                  type="text"
                  value={draftCard.meetingDay}
                  onChange={(event) => updateDraft("meetingDay", event.target.value)}
                />
              </label>

              <label className="team-edit-field">
                <span>Время начала встречи</span>
                <input
                  type="text"
                  value={draftCard.meetingTime}
                  onChange={(event) => updateDraft("meetingTime", event.target.value)}
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
                    <input
                      type="text"
                      value={curator.name}
                      onChange={(event) => updateCurator(index, event.target.value)}
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

            <button className="team-save-button" type="submit" disabled={isSaving}>
              Сохранить
            </button>
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
    </div>
  );
};

export default TeamPage;
