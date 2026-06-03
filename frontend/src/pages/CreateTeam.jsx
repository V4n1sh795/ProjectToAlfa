import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import closeAlertIcon from "../assets/icons/close_alert.svg";
import "./css/CreateTeam.css";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
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

const normalizeTime = (value) => String(value || "").trim().slice(0, 5);

const getDayLabel = (value) =>
  dayOptions.find((day) => String(day.id) === String(value))?.name || value;

const hasFullName = (value) => String(value || "").trim().split(/\s+/).length >= 3;

const createEmptyMember = () => ({
  name: "",
  group: "",
  role: "",
  stack: "",
  contact: "",
  exists: true,
});

const TeamSelect = ({
  id,
  value,
  placeholder,
  options,
  isOpen,
  onChange,
  onToggle,
}) => {
  const selectedOption = options.find((option) => String(option.id) === String(value));

  return (
    <div className={`create-team-select ${isOpen ? "is-open" : ""} ${value ? "has-value" : ""}`}>
      <button
        className="create-team-select__button"
        type="button"
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedOption?.name || placeholder}</span>
        <span className="create-team-select__arrow" />
      </button>

      {isOpen && (
        <div className="create-team-select__menu" role="listbox">
          <button
            className={`create-team-select__option ${value ? "" : "is-selected"}`}
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => onChange("")}
          >
            {placeholder}
          </button>
          {options.map((option) => (
            <button
              className={`create-team-select__option ${
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

function CreateTeam() {
  const [teamName, setTeamName] = useState("");
  const [availableProjects, setAvailableProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [members, setMembers] = useState([createEmptyMember()]);
  const [callDay, setCallDay] = useState("");
  const [callTime, setCallTime] = useState("");
  const [errors, setErrors] = useState({});
  const [openSelect, setOpenSelect] = useState(null);
  const [alert, setAlert] = useState(null);

  const timeOptions = useMemo(() => buildTimeOptions(), []);
  const projectOptions = useMemo(
    () =>
      availableProjects.map((project) => ({
        id: getValue(project, ["id", "Id", "key", "Key"]),
        name: getValue(project, ["name", "Name", "value", "Value"], "Проект"),
      })),
    [availableProjects],
  );

  useEffect(() => {
    api
      .get("/project")
      .then((response) => setAvailableProjects(Array.isArray(response.data) ? response.data : []))
      .catch((error) => console.error("Error fetching projects:", error));
  }, []);

  useEffect(() => {
    const handleDocumentMouseDown = (event) => {
      if (event.target.closest?.(".create-team-select")) return;
      setOpenSelect(null);
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => document.removeEventListener("mousedown", handleDocumentMouseDown);
  }, []);

  const resetForm = () => {
    setTeamName("");
    setProjectId("");
    setMembers([createEmptyMember()]);
    setCallDay("");
    setCallTime("");
    setErrors({});
    setOpenSelect(null);
  };

  const addMember = () => {
    setMembers((currentMembers) => [...currentMembers, createEmptyMember()]);
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

  const isScheduleBusy = async () => {
    const response = await api.get("/get_team");
    const teams = Array.isArray(response.data) ? response.data : [];
    const selectedDay = normalizeDay(callDay);
    const selectedTime = normalizeTime(callTime);

    return teams.some((team) => {
      const teamDay = normalizeDay(getValue(team, ["callDay", "CallDay"]));
      const teamTime = normalizeTime(getValue(team, ["callTime", "CallTime"]));
      return teamDay === selectedDay && teamTime === selectedTime;
    });
  };

  const createTeam = async (teamData) => {
    try {
      const response = await api.post("/team", teamData);
      console.log(response);
      setAlert({
        type: "success",
        title: "Успешно",
        message: "Команда создана",
      });
      resetForm();
      return true;
    } catch (error) {
      console.error("Error creating team: ", error);
      setAlert({
        type: "error",
        title: "Ошибка",
        message: error.response?.data?.message || "Не удалось создать команду",
      });
      return false;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const hasEmptyMember = members.some(
      (member) =>
        !member.name.trim() ||
        !member.group.trim() ||
        !member.role.trim() ||
        !member.stack.trim(),
    );
    const hasInvalidMemberName = members.some((member) => !hasFullName(member.name));

    const newErrors = {};

    if (!teamName.trim()) newErrors.teamName = "Введите название команды";
    if (!projectId) newErrors.project = "Выберите проект";
    if (!callDay) newErrors.callDay = "Выберите день недели";
    if (!callTime) newErrors.callTime = "Выберите время";
    if (members.length === 0 || hasEmptyMember) {
      newErrors.members = "Заполните все обязательные поля участников";
    } else if (hasInvalidMemberName) {
      newErrors.members = "Введите ФИО участника полностью";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    try {
      if (await isScheduleBusy()) {
        setAlert({
          type: "error",
          title: "Ошибка",
          message: "Такая дата и время уже заняты",
        });
        return;
      }
    } catch (error) {
      console.error("Error checking schedule:", error);
      setAlert({
        type: "error",
        title: "Ошибка",
        message: "Не удалось проверить расписание",
      });
      return;
    }

    const teamData = {
      name: teamName.trim(),
      projectId: Number(projectId),
      members_l: members.map((member) => ({
        name: member.name.trim(),
        group: member.group.trim(),
        role: member.role.trim(),
        stack: member.stack.trim(),
        exists: member.exists,
      })),
      curators: [],
      callDay: getDayLabel(callDay),
      callTime,
    };

    console.log("Данные команды:", teamData);
    await createTeam(teamData);
  };

  return (
    <div className="create-team-page">
      <h2>Создание новой команды</h2>

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
              {errors.teamName && <p className="create-team-error">{errors.teamName}</p>}
            </div>

            <div className="create-team-field create-team-field--project">
              <label>
                Проект <span>*</span>
              </label>
              <TeamSelect
                id="project"
                value={projectId}
                placeholder="Выберите проект"
                options={projectOptions}
                isOpen={openSelect === "project"}
                onToggle={() => setOpenSelect((current) => (current === "project" ? null : "project"))}
                onChange={(value) => {
                  setProjectId(value);
                  setOpenSelect(null);
                }}
              />
              {errors.project && <p className="create-team-error">{errors.project}</p>}
            </div>

            <div className="create-team-field create-team-field--schedule">
              <label>
                Расписание встреч (созвонов) <span>*</span>
              </label>
              <div className="create-team-schedule-row">
                <div>
                  <TeamSelect
                    id="call-day"
                    value={callDay}
                    placeholder="Выберите день недели"
                    options={dayOptions}
                    isOpen={openSelect === "call-day"}
                    onToggle={() =>
                      setOpenSelect((current) => (current === "call-day" ? null : "call-day"))
                    }
                    onChange={(value) => {
                      setCallDay(value);
                      setOpenSelect(null);
                    }}
                  />
                  {errors.callDay && <p className="create-team-error">{errors.callDay}</p>}
                </div>
                <div>
                  <TeamSelect
                    id="call-time"
                    value={callTime}
                    placeholder="Выберите время (доп.)"
                    options={timeOptions}
                    isOpen={openSelect === "call-time"}
                    onToggle={() =>
                      setOpenSelect((current) => (current === "call-time" ? null : "call-time"))
                    }
                    onChange={(value) => {
                      setCallTime(value);
                      setOpenSelect(null);
                    }}
                  />
                  {errors.callTime && <p className="create-team-error">{errors.callTime}</p>}
                </div>
              </div>
              <small>Выберите день недели и время для регулярных созвонов команды.</small>
            </div>
          </div>

          <div className="create-team-column create-team-column--right">
            <div className="create-team-field create-team-field--members">
              <label>
                Участники <span>*</span>
              </label>

              <div className="create-team-members">
                {members.map((member, index) => (
                  <div className="create-team-member" key={`member-${index}`}>
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
                      onChange={(event) => handleMemberChange(index, "name", event.target.value)}
                      placeholder="ФИО"
                    />
                    <input
                      type="text"
                      value={member.group}
                      onChange={(event) => handleMemberChange(index, "group", event.target.value)}
                      placeholder="Академическая группа"
                    />
                    <input
                      type="text"
                      value={member.role}
                      onChange={(event) => handleMemberChange(index, "role", event.target.value)}
                      placeholder="Роль в команде"
                    />
                    <input
                      type="text"
                      value={member.stack}
                      onChange={(event) => handleMemberChange(index, "stack", event.target.value)}
                      placeholder="Стек"
                    />
                    <input
                      type="text"
                        value={member.contact}
                        onChange={(event) => handleMemberChange(index, "contact", event.target.value)}
                        placeholder="Контакты (необ.)"
                      />
                    <label className="create-team-radio create-team-radio--member">
                      <input
                        type="checkbox"
                        checked={member.exists}
                        onChange={(event) =>
                          handleMemberChange(index, "exists", event.target.checked)
                        }
                      />
                      <span>Участник есть в базе</span>
                    </label>
                  </div>
                ))}
              </div>
              {errors.members && <p className="create-team-error">{errors.members}</p>}
            </div>

            <button className="create-team-add" type="button" onClick={addMember}>
              + Добавить участника
            </button>
            <small className="create-team-note">Можно добавить несколько участников.</small>

            <button className="create-team-submit" type="submit">
              Создать команду
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default CreateTeam;
