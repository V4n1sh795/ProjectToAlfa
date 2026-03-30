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
      const response = await api.post("/team", teamData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      console.log(response);
      alert("Команда создаана. Проверь консоль для просмотра данных");
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

    // Можно добавить проверку на выбор одного и того же куратора
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

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    console.log("Данные команды:", teamData);

    await createTeam(teamData);
    // Можно добавить очистку формы
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
          {/* Стоит убирать ошибку после изменения */}
          {errors.teamName && <p>{errors.teamName}</p>}
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
          {/* Стоит убирать ошибку после изменения */}
          {errors.project && <p>{errors.project}</p>}
        </div>

        <div>
          <label>Участники</label>
          <div>
            {members.map((member, index) => (
              <div key={index}>
                <input
                  type="text"
                  value={member.name}
                  onChange={(e) =>
                    handleMemberChange(index, "name", e.target.value)
                  }
                  required
                  placeholder="Имя"
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
            {/* Стоит убирать ошибку после изменения */}
            {errors.members && <p>{errors.members}</p>}
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
              <div key={index}>
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
            {/* Стоит убирать ошибку после изменения */}
            {errors.curators && <p>{errors.curators}</p>}
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
