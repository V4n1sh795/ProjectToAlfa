import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import closeAlertIcon from "../assets/icons/close_alert.svg";
import SelectDropdown from "../components/SelectDropdown";
import "./css/CreateTeam.css";

const api = axios.create({
  baseURL: "/api",
});

const dayOptions = [
  { id: "Monday", name: "Понедельник" },
  { id: "Tuesday", name: "Вторник" },
  { id: "Wednesday", name: "Среда" },
  { id: "Thursday", name: "Четверг" },
  { id: "Friday", name: "Пятница" },
  { id: "Saturday", name: "Суббота" },
  { id: "Sunday", name: "Воскресенье" },
];

const dayValuesByLabel = dayOptions.reduce(
  (result, day) => ({ ...result, [day.name.toLowerCase()]: day.id }),
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
    if (Object.prototype.hasOwnProperty.call(source, name)) {
      const value = source[name];
      if (value !== null && value !== undefined) return value;
    }
  }

  return fallback;
};

const normalizeDay = (value) => {
  const normalized = String(value || "").trim();
  return dayValuesByLabel[normalized.toLowerCase()] || normalized;
};

const normalizeTime = (value) =>
  String(value || "")
    .trim()
    .slice(0, 5);

export const getDayLabel = (value) =>
  dayOptions.find((day) => String(day.id) === String(value))?.name || value;

const hasFullName = (value) =>
  String(value || "")
    .trim()
    .split(/\s+/).length >= 3;

const createEmptyMember = () => ({
  name: "",
  group: "",
  role: "",
  stack: "",
  contact: "",
  exists: true,
});

const TeamAlert = ({ type, title, message, onClose }) => (
  <div className="create-team-alert-backdrop">
    <section className={`create-team-alert create-team-alert--${type}`}>
      <button
        className="create-team-alert__close"
        type="button"
        onClick={onClose}
        aria-label="Закрыть уведомление"
      >
        <img src={closeAlertIcon} alt="" />
      </button>
      <h3>{title}</h3>
      <p>{message}</p>
    </section>
  </div>
);

export function CreateTeamForm({
  projects,
  onCreate,
  initialDraft,
  title = "Создание новой команды",
  submitLabel = "Создать команду",
  requireSchedule = true,
}) {
  const [teamName, setTeamName] = useState(initialDraft?.name ?? "");
  const [projectId, setProjectId] = useState(initialDraft?.projectId ?? "");
  const [members, setMembers] = useState(() =>
    (initialDraft?.members?.length ? initialDraft.members : [createEmptyMember()])
      .map((member, key) => ({
        id: member.id,
        name: member.name ?? "",
        group: member.group ?? "",
        role: member.role ?? "",
        stack: member.stack ?? "",
        contact: member.contact ?? "",
        exists: member.exists ?? false,
        key,
      })),
  );
  const nextMemberKey = useRef(members.length);
  const [callDay, setCallDay] = useState(() => normalizeDay(initialDraft?.callDay));
  const [callTime, setCallTime] = useState(() => normalizeTime(initialDraft?.callTime));
  const [errors, setErrors] = useState({});
  const [openSelect, setOpenSelect] = useState(null);
  const [alert, setAlert] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const timeOptions = useMemo(() => buildTimeOptions(), []);
  const projectOptions = useMemo(
    () =>
      projects.map((project) => ({
        id: getValue(project, ["id", "Id", "key", "Key"]),
        name: getValue(project, ["name", "Name", "value", "Value"], "Проект"),
      })),
    [projects],
  );

  useEffect(() => {
    const handleDocumentMouseDown = (event) => {
      if (event.target.closest?.(".create-team-select")) return;
      setOpenSelect(null);
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () =>
      document.removeEventListener("mousedown", handleDocumentMouseDown);
  }, []);

  const resetForm = () => {
    setTeamName("");
    setProjectId("");
    setMembers([{ ...createEmptyMember(), key: nextMemberKey.current++ }]);
    setCallDay("");
    setCallTime("");
    setErrors({});
    setOpenSelect(null);
  };

  const addMember = () => {
    const member = { ...createEmptyMember(), key: nextMemberKey.current++ };
    setMembers((currentMembers) => [...currentMembers, member]);
  };

  const removeMember = (index) => {
    setMembers((currentMembers) =>
      currentMembers.length === 1
        ? currentMembers
        : currentMembers.filter((_, memberIndex) => memberIndex !== index),
    );
  };

  const handleMemberChange = (index, field, value) => {
    setMembers((currentMembers) =>
      currentMembers.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [field]: value } : member,
      ),
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSaving) return;

    const emptyMemberIndex = members.findIndex(
      (member) =>
        !member.name.trim() ||
        !member.group.trim() ||
        !member.role.trim() ||
        !member.stack.trim(),
    );
    const invalidNameIndex = members.findIndex(
      (member) => !hasFullName(member.name),
    );

    const newErrors = {};

    if (!teamName.trim()) newErrors.teamName = "Введите название команды";
    if (!projectId) newErrors.project = "Выберите проект";
    if ((requireSchedule || callTime) && !callDay) newErrors.callDay = "Выберите день недели";
    if ((requireSchedule || callDay) && !callTime) newErrors.callTime = "Выберите время";
    if (members.length === 0 || emptyMemberIndex !== -1) {
      newErrors.members = "Заполните все обязательные поля участников";
    } else if (invalidNameIndex !== -1) {
      newErrors.members = "Введите ФИО участника полностью";
    }

    setErrors(newErrors);

    const [firstError] = Object.keys(newErrors);
    if (firstError) {
      if (initialDraft) {
        const memberIndex = emptyMemberIndex === -1 ? invalidNameIndex : emptyMemberIndex;
        const fields = {
          teamName: "#teamName",
          project: "#project",
          callDay: "#call-day",
          callTime: "#call-time",
          members: `.create-team-member:nth-child(${memberIndex + 1}) input`,
        };
        event.currentTarget.querySelector(fields[firstError])?.focus();
      }
      return;
    }

    const draft = {
      name: teamName.trim(),
      projectId,
      members: members.map(({ id, name, group, role, stack, contact, exists }) => ({
        ...(id == null ? {} : { id }),
        name: name.trim().replace(/\s+/g, " "),
        group: group.trim(),
        role: role.trim(),
        stack: stack.trim(),
        contact: contact.trim(),
        exists,
      })),
      callDay,
      callTime,
    };

    setIsSaving(true);
    try {
      await onCreate(draft);
      if (!initialDraft) {
        resetForm();
        setAlert({ type: "success", title: "Успешно", message: "Команда создана" });
      }
    } catch (error) {
      setAlert({
        type: "error",
        title: "Ошибка",
        message: error.response?.data?.message || error.message || "Не удалось создать команду",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="create-team-page">
      <h1>{title}</h1>

      {alert && (
        <TeamAlert
          type={alert.type}
          title={alert.title}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <form className="create-team-form" onSubmit={handleSubmit}>
        <div className="create-team-grid">
          <div className="create-team-column create-team-column--left">
            <div className="create-team-field">
              <label htmlFor="teamName">
                Название команды <span>*</span>
              </label>
              <input
                type="text"
                id="teamName"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="Введите название команды"
              />
              {errors.teamName && (
                <p className="create-team-error">{errors.teamName}</p>
              )}
            </div>

            <div className="create-team-field create-team-field--project">
              <label htmlFor="project">
                Проект <span>*</span>
              </label>
              <SelectDropdown
                id="project"
                value={projectId}
                placeholder="Выберите проект"
                options={projectOptions}
                isOpen={openSelect === "project"}
                classNamePrefix="create-team-select"
                showHasValueClass
                onToggle={() =>
                  setOpenSelect((current) =>
                    current === "project" ? null : "project",
                  )
                }
                onChange={(value) => {
                  setProjectId(value);
                  setOpenSelect(null);
                }}
              />
              {errors.project && (
                <p className="create-team-error">{errors.project}</p>
              )}
            </div>

            <div className="create-team-field create-team-field--schedule">
              <label>
                Расписание встреч (созвонов) {requireSchedule && <span>*</span>}
              </label>
              <div className="create-team-schedule-row">
                <div>
                  <SelectDropdown
                    id="call-day"
                    ariaLabel="День встречи"
                    value={callDay}
                    placeholder="Выберите день недели"
                    options={dayOptions}
                    isOpen={openSelect === "call-day"}
                    classNamePrefix="create-team-select"
                    showHasValueClass
                    onToggle={() =>
                      setOpenSelect((current) =>
                        current === "call-day" ? null : "call-day",
                      )
                    }
                    onChange={(value) => {
                      setCallDay(value);
                      setOpenSelect(null);
                    }}
                  />
                  {errors.callDay && (
                    <p className="create-team-error">{errors.callDay}</p>
                  )}
                </div>
                <div>
                  <SelectDropdown
                    id="call-time"
                    ariaLabel="Время встречи"
                    value={callTime}
                    placeholder="Выберите время (доп.)"
                    options={timeOptions}
                    isOpen={openSelect === "call-time"}
                    classNamePrefix="create-team-select"
                    showHasValueClass
                    onToggle={() =>
                      setOpenSelect((current) =>
                        current === "call-time" ? null : "call-time",
                      )
                    }
                    onChange={(value) => {
                      setCallTime(value);
                      setOpenSelect(null);
                    }}
                  />
                  {errors.callTime && (
                    <p className="create-team-error">{errors.callTime}</p>
                  )}
                </div>
              </div>
              <small>
                Выберите день недели и время для регулярных созвонов команды.
              </small>
            </div>
          </div>

          <div className="create-team-column create-team-column--right">
            <div className="create-team-field create-team-field--members">
              <label>
                Участники <span>*</span>
              </label>

              <div className="create-team-members">
                {members.map((member, index) => (
                  <div className="create-team-member" key={member.key}>
                    {members.length > 1 && (
                      <button
                        className="create-team-remove"
                        type="button"
                        onClick={() => removeMember(index)}
                        aria-label="Удалить участника"
                      >
                        ×
                      </button>
                    )}
                    <input
                      type="text"
                      value={member.name}
                      onChange={(event) =>
                        handleMemberChange(index, "name", event.target.value)
                      }
                      placeholder="ФИО"
                      aria-label={`ФИО, участник ${index + 1}`}
                    />
                    <input
                      type="text"
                      value={member.group}
                      onChange={(event) =>
                        handleMemberChange(index, "group", event.target.value)
                      }
                      placeholder="Академическая группа"
                      aria-label={`Академическая группа, участник ${index + 1}`}
                    />
                    <input
                      type="text"
                      value={member.role}
                      onChange={(event) =>
                        handleMemberChange(index, "role", event.target.value)
                      }
                      placeholder="Роль в команде"
                      aria-label={`Роль, участник ${index + 1}`}
                    />
                    <input
                      type="text"
                      value={member.stack}
                      onChange={(event) =>
                        handleMemberChange(index, "stack", event.target.value)
                      }
                      placeholder="Стек"
                      aria-label={`Стек, участник ${index + 1}`}
                    />
                    <input
                      type="text"
                      value={member.contact}
                      onChange={(event) =>
                        handleMemberChange(index, "contact", event.target.value)
                      }
                      placeholder="Контакты (необ.)"
                      aria-label={`Контакты, участник ${index + 1}`}
                    />
                    <label className="create-team-radio create-team-radio--member">
                      <input
                        type="checkbox"
                        checked={member.exists}
                        onChange={(event) =>
                          handleMemberChange(
                            index,
                            "exists",
                            event.target.checked,
                          )
                        }
                      />
                      <span className="member-in-db">Участник есть в базе</span>
                    </label>
                  </div>
                ))}
              </div>
              {errors.members && (
                <p className="create-team-error">{errors.members}</p>
              )}
            </div>

            <button
              className="create-team-add"
              type="button"
              onClick={addMember}
            >
              + Добавить участника
            </button>
            <small className="create-team-note">
              Можно добавить несколько участников.
            </small>

            <button className="create-team-submit" type="submit" disabled={isSaving}>
              {submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function CreateTeam() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    api.get("/project", { signal: controller.signal })
      .then(({ data }) => setProjects(Array.isArray(data) ? data : []))
      .catch((error) => {
        if (!controller.signal.aborted) console.error("Error fetching projects:", error);
      });
    return () => controller.abort();
  }, []);

  async function createTeam({ name, projectId, callDay, callTime, members }) {
    let teams;
    try {
      const { data } = await api.get("/get_team");
      teams = Array.isArray(data) ? data : [];
    } catch {
      throw new Error("Не удалось проверить расписание");
    }
    if (teams.some((team) =>
      normalizeDay(getValue(team, ["callDay", "CallDay"])) === normalizeDay(callDay) &&
      normalizeTime(getValue(team, ["callTime", "CallTime"])) === normalizeTime(callTime)
    )) {
      throw new Error("Такая дата и время уже заняты");
    }

    try {
      await api.post("/team", {
        name,
        projectId: Number(projectId),
        members_l: members.map(({ name, group, role, stack, exists }) => ({
          name, group, role, stack, exists,
        })),
        curators: [],
        callDay: getDayLabel(callDay),
        callTime,
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
    } catch (error) {
      throw new Error(error.response?.data?.message || "Не удалось создать команду");
    }
  }

  return <CreateTeamForm projects={projects} onCreate={createTeam} />;
}
