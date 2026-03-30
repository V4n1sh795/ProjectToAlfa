import axios from "axios";
import { useState, useEffect } from "react";
import "./css/CreateTeam.css";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

function CreateTeam() {
  const [teamName, setTeamName] = useState("");
  const [availableProjects, setAvailableProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [availableCurators, setAvailableCurators] = useState([]);
  const [curatorIds, setCuratorIds] = useState([""]);
  const [members, setMembers] = useState([
    { name: "", group: "", role: "", stack: "" },
  ]);
  const [errors, setErrors] = useState({});
  
  // Новые состояния для дня недели и времени созвона
  const [callDay, setCallDay] = useState("");
  const [callTime, setCallTime] = useState("");

  // Дни недели для выбора
  const weekDays = [
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
    "Воскресенье"
  ];

  useEffect(() => {
    api
      .get("/project")
      .then((response) => setAvailableProjects(response.data))
      .catch((error) => console.error("Error fetching projects:", error));

    api
      .get("/curators")
      .then((response) => setAvailableCurators(response.data))
      .catch((error) => console.error("Error fetching curators:", error));
  }, []);

  const addMember = () => {
    setMembers([...members, { name: "", group: "", role: "", stack: "" }]);
  };

  const removeMember = (index) => {
    if (members.length === 1) return;

    const updatedMembers = members.filter((_, i) => i !== index);
    setMembers(updatedMembers);
  };

  const handleMemberChange = (index, field, value) => {
    const updatedMembers = [...members];
    updatedMembers[index] = {
      ...updatedMembers[index],
      [field]: value,
    };
    setMembers(updatedMembers);
  };

  const addCurator = () => {
    setCuratorIds([...curatorIds, ""]);
  };

  const removeCurator = (index) => {
    if (curatorIds.length === 1) return;
    const updatedCurators = curatorIds.filter((_, i) => i !== index);
    setCuratorIds(updatedCurators);
  };

  const handleCuratorChange = (index, value) => {
    const updatedCurators = [...curatorIds];
    updatedCurators[index] = value;
    setCuratorIds(updatedCurators);
  };

  const createTeam = async (teamData) => {
    try {
      const response = await api.post("/team", teamData);
      console.log(response);
      alert("Команда создана. Проверь консоль для просмотра данных");
      return true;
    } catch (error) {
      console.error("Error creating team: ", error);
      alert(
        "Ошибка при создании команды: " +
          (error.response?.data?.message || error.message),
      );
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const teamData = {
      name: teamName.trim(),
      projectId: projectId,
      members: members.map((member) => ({
        name: member.name.trim(),
        group: member.group.trim(),
        role: member.role.trim(),
        stack: member.stack.trim(),
      })),
      curators: curatorIds.filter((curator) => curator !== ""),
      callDay: callDay, // Добавляем день созвона
      callTime: callTime, // Добавляем время созвона
    };

    const newErrors = {};

    const hasEmptyMember = members.some((member) => {
      return (
        !member.name.trim() ||
        !member.group.trim() ||
        !member.role.trim() ||
        !member.stack.trim()
      );
    });

    if (!teamName.trim()) {
      newErrors.teamName = "Введите название команды";
    }
    if (!projectId) {
      newErrors.project = "Выберите проект";
    }
    if (curatorIds.filter((c) => c !== "").length === 0) {
      newErrors.curators = "Выберите хотя бы одного куратора";
    }
    if (members.length === 0 || hasEmptyMember) {
      newErrors.members = "Заполните все поля участников";
    }
    if (!callDay) {
      newErrors.callDay = "Выберите день недели для созвона";
    }
    if (!callTime) {
      newErrors.callTime = "Выберите время созвона";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    console.log("Данные команды:", teamData);

    await createTeam(teamData);
  };

  return (
    <div>
      <h2>Создание новой команды</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="teamName">Название команды</label>
          <input
            type="text"
            id="teamName"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
            placeholder="Введите название команды"
          />
          {errors.teamName && <p className="error">{errors.teamName}</p>}
        </div>

        <div>
          <label htmlFor="project">Проект</label>
          <select
            id="project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            required
          >
            <option value="">Выберите проект</option>
            {availableProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {errors.project && <p className="error">{errors.project}</p>}
        </div>

        {/* Новый блок выбора дня недели и времени созвона */}
        <div className="form-group call-schedule">
          <label>Расписание созвонов</label>
          <div className="call-schedule-container">
            <div className="call-day-select">
              <select
                value={callDay}
                onChange={(e) => setCallDay(e.target.value)}
                required
              >
                <option value="">Выберите день недели</option>
                {weekDays.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
              {errors.callDay && <p className="error">{errors.callDay}</p>}
            </div>

            <div className="call-time-select">
              <input
                type="time"
                value={callTime}
                onChange={(e) => setCallTime(e.target.value)}
                required
                step="300" // Шаг в 5 минут (300 секунд)
              />
              {errors.callTime && <p className="error">{errors.callTime}</p>}
            </div>
          </div>
          <small>Выберите день недели и время для регулярных созвонов команды.</small>
        </div>

        <div>
          <label>Участники</label>
          <div>
            {members.map((member, index) => (
              <div key={index} className="member-item">
                <input
                  type="text"
                  value={member.name}
                  onChange={(e) =>
                    handleMemberChange(index, "name", e.target.value)
                  }
                  required
                  placeholder="ФИО"
                />
                <input
                  type="text"
                  value={member.group}
                  onChange={(e) =>
                    handleMemberChange(index, "group", e.target.value)
                  }
                  required
                  placeholder="Академическая группа"
                />
                <input
                  type="text"
                  value={member.role}
                  onChange={(e) =>
                    handleMemberChange(index, "role", e.target.value)
                  }
                  required
                  placeholder="Роль в команде"
                />
                <input
                  type="text"
                  value={member.stack}
                  onChange={(e) =>
                    handleMemberChange(index, "stack", e.target.value)
                  }
                  required
                  placeholder="Стек"
                />

                {members.length > 1 && (
                  <button type="button" onClick={() => removeMember(index)}>
                    ✕
                  </button>
                )}
              </div>
            ))}
            {errors.members && <p className="error">{errors.members}</p>}
          </div>
          <button type="button" onClick={addMember}>
            + Добавить участника
          </button>
          <small>Можно добавить несколько участников.</small>
        </div>

        <div className="form-group">
          <label>Кураторы</label>
          <div>
            {curatorIds.map((curator, index) => (
              <div key={index} className="curator-item">
                <select
                  value={curator}
                  onChange={(e) => handleCuratorChange(index, e.target.value)}
                  required
                >
                  <option value="">Выберите куратора</option>
                  {availableCurators.map((curator) => (
                    <option key={curator.id} value={curator.id}>
                      {curator.name}
                    </option>
                  ))}
                </select>
                {curatorIds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCurator(index)}
                    title="Удалить куратора"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {errors.curators && <p className="error">{errors.curators}</p>}
          </div>
          <button type="button" onClick={addCurator}>
            + Добавить куратора
          </button>
          <small>
            Выберите кураторов из списка. Можно добавить нескольких.
          </small>
        </div>

        <button type="submit">Создать команду</button>
      </form>
    </div>
  );
}

export default CreateTeam;