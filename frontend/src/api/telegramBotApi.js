import axios from "axios";

const api = axios.create({ baseURL: "/api" });

function authHeaders() {
  let token = null;
  try {
    token = localStorage.getItem("token");
  } catch {
    // storage unavailable: the request goes without a token and the server answers 401
  }
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const unsupported = () => Promise.reject(new Error("Заявки команд пока не поддерживаются сервером"));

/**
 * Data source for TelegramBotPage backed by the real API.
 * Cases and the recruiting switch are stored on the server (Project.IsRecruitmentOpen).
 * Team requests have no server endpoints yet, so every case has an empty request list.
 */
export function createTelegramBotApi() {
  return {
    async load({ signal } = {}) {
      const response = await api.get("/project", { signal });
      const projects = (Array.isArray(response.data) ? response.data : []).map((item) => ({
        id: item.id,
        name: item.name,
      }));
      const cases = (Array.isArray(response.data) ? response.data : []).map((item) => ({
        id: item.id,
        name: item.name,
        recruiting: item.isRecruitmentOpen !== false,
        requests: [],
      }));
      return { cases, projects };
    },
    async setRecruiting(caseId, recruiting) {
      const response = await api.put(
        `/projects/${caseId}/recruitment`,
        { isRecruitmentOpen: recruiting },
        { headers: authHeaders() },
      );
      return response.data.isRecruitmentOpen;
    },
    acceptRequest: unsupported,
    declineRequest: unsupported,
    scheduleTeam: unsupported,
    updateTeam: unsupported,
  };
}
