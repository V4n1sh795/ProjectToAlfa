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

const list = (data) => (Array.isArray(data) ? data : []);

// The server answers with a request whose id is the team id; the page expects the same shape.
const toRequest = (item) => ({
  id: item.id,
  status: item.status,
  date: item.date,
  reason: item.reason || undefined,
  team: item.team,
});

// callDay and callTime are only sent when set, so editing a not yet scheduled team does not require them.
const toDraft = (draft) => ({
  name: draft.name,
  projectId: draft.projectId === "" || draft.projectId == null ? undefined : Number(draft.projectId),
  callDay: draft.callDay || "",
  callTime: draft.callTime || "",
  members: (draft.members ?? []).map(({ name, group, role, stack, contact }) => ({
    name, group, role, stack, contact: contact || "",
  })),
});

async function post(path, body) {
  const response = await api.post(path, body, { headers: authHeaders() });
  return toRequest(response.data);
}

/**
 * Data source for TelegramBotPage backed by the real API.
 * Cases and the recruiting switch come from /project (Project.IsRecruitmentOpen),
 * team requests from /telegram/requests (a request id is the team id).
 */
export function createTelegramBotApi() {
  return {
    async load({ signal } = {}) {
      const headers = authHeaders();
      const [projectsResponse, requestsResponse] = await Promise.all([
        api.get("/project", { signal }),
        api.get("/telegram/requests", { signal, headers }),
      ]);
      const requests = list(requestsResponse.data).map((item) => ({ projectId: item.projectId, request: toRequest(item) }));
      const projects = list(projectsResponse.data);
      return {
        projects: projects.map(({ id, name }) => ({ id, name })),
        cases: projects.map((item) => ({
          id: item.id,
          name: item.name,
          recruiting: item.isRecruitmentOpen !== false,
          requests: requests.filter(({ projectId }) => projectId === item.id).map(({ request }) => request),
        })),
      };
    },
    async setRecruiting(caseId, recruiting) {
      const response = await api.put(
        `/projects/${caseId}/recruitment`,
        { isRecruitmentOpen: recruiting },
        { headers: authHeaders() },
      );
      return response.data.isRecruitmentOpen;
    },
    acceptRequest: (caseId, requestId) => post(`/telegram/requests/${requestId}/accept`),
    declineRequest: (caseId, requestId, reason) => post(`/telegram/requests/${requestId}/decline`, { reason }),
    scheduleTeam: (caseId, requestId, draft) => post(`/telegram/requests/${requestId}/schedule`, toDraft(draft)),
    async updateTeam(caseId, requestId, draft) {
      const response = await api.put(`/telegram/requests/${requestId}`, toDraft(draft), { headers: authHeaders() });
      return toRequest(response.data);
    },
  };
}
