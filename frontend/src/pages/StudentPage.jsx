import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import "./css/Search.css";
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
  key: getValue(item, ["key", "Key"], null),
  value: getValue(item, ["value", "Value"], ""),
});

const parseProfile = (profile) => {
  if (typeof profile === "object" && profile !== null) {
    return {
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

const StudentPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const initialStudent = location.state?.student;
  const [student, setStudent] = useState(initialStudent || null);
  const [team, setTeam] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(!initialStudent);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [savedCard, setSavedCard] = useState(null);
  const [draftCard, setDraftCard] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadStudent = async () => {
      setLoading(true);
      setError("");

      try {
        const memberResponse = await fetch(`/api/member/${id}`);
        if (!memberResponse.ok) throw new Error("Студент не найден");
        const member = await memberResponse.json();
        if (cancelled) return;

        const teamId = getValue(
          member,
          ["team_id", "teamId", "Team_id", "TeamId"],
          null,
        );
        setStudent((prev) => ({
          ...member,
          ...prev,
          profiles: getValue(member, ["profiles", "Profiles"], []),
          teamname: getValue(member, ["teamname", "Teamname"], ""),
          team_id: teamId,
        }));

        if (!teamId) return;

        const [teamResponse, rawTeamsResponse] = await Promise.all([
          fetch(`/api/team/${teamId}`),
          fetch("/api/get_team"),
        ]);

        const teamData = teamResponse.ok ? await teamResponse.json() : null;
        const rawTeams = rawTeamsResponse.ok
          ? await rawTeamsResponse.json()
          : [];
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

  const profiles = useMemo(() => {
    const rawProfiles = getValue(student, ["profiles", "Profiles"], []);
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
  const teamName =
    getValue(student, ["teamname", "Teamname"], "") ||
    getValue(team, ["name", "Name"], emptyValue);
  const semester = getValue(project, ["semester", "Semester"], "");
  const technology = getValue(
    project,
    ["technology", "Technology"],
    emptyValue,
  );
  const contact = getValue(
    student,
    ["email", "Email", "phone", "Phone"],
    "",
  );

  const cardData = useMemo(
    () =>
      savedCard || {
        contact,
        records: profiles.map((profile, index) => ({
          semesterTitle: formatSemester(semester, index),
          teamName,
          projectName,
          role: profile.role,
          stack: profile.stack || technology,
          comment: profile.comment,
        })),
      },
    [contact, profiles, projectName, savedCard, semester, teamName, technology],
  );

  const startEditing = () => {
    setDraftCard(JSON.parse(JSON.stringify(cardData)));
    setIsEditing(true);
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

  const saveDraft = (event) => {
    event.preventDefault();
    setSavedCard(draftCard);
    setIsEditing(false);
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
                  <input
                    value={record.teamName}
                    onChange={(event) =>
                      updateDraft("teamName", event.target.value, index)
                    }
                  />
                </label>

                <label className="student-edit-field">
                  <span>Проект</span>
                  <input
                    value={record.projectName}
                    onChange={(event) =>
                      updateDraft("projectName", event.target.value, index)
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

            <button className="student-save-button" type="submit">
              Сохранить
            </button>
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
    </div>
  );
};

export default StudentPage;
