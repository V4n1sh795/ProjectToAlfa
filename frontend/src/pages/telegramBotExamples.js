// Local examples from the design. These IDs are never sent to a server.
const exampleProjects = [
  { id: "web", name: "Разработка Web-приложения" },
  { id: "assistant", name: "Разработка AI-ассистента" },
];

const exampleMembers = [
  { name: "Зинатулин Тимур Аликович", group: "РИ-340944", role: "Тим-лид", stack: "YouGile", contact: "@coolguy67" },
  { name: "Мамонтов Никита Вячеславович", group: "РИ-340952", role: "Дизайнер", stack: "Figma", contact: "" },
  { name: "Мохов Евгений Иванович", group: "РИ-341488", role: "Аналитик", stack: "Google Docs, Yandex Datalens", contact: "" },
  { name: "Трифонов Данил Владимирович", group: "РИ-340969", role: "Бэкенд", stack: "Python, Django, JavaScript, Docker", contact: "" },
];

export const declineExampleId = "decline-example";

function exampleRequest(id, status) {
  return {
    id,
    status,
    date: "2026-10-05",
    team: {
      name: "MeSu",
      projectId: "assistant",
      callDay: "",
      callTime: "",
      members: exampleMembers.map((member) => ({ ...member, exists: true })),
      artifacts: "@coolguy67",
    },
  };
}

export function createTelegramBotPreview(showDeclineExample) {
  let cases = [
    { ...exampleProjects[0], recruiting: true, requests: [] },
    {
      ...exampleProjects[1],
      recruiting: false,
      requests: [
        exampleRequest("in-progress", "scheduled"),
        exampleRequest("accepted", "accepted"),
        exampleRequest("pending", "pending"),
        ...(showDeclineExample ? [exampleRequest(declineExampleId, "pending")] : []),
      ],
    },
  ];

  function updateRequest(caseId, requestId, update) {
    const project = cases.find(({ id }) => id === caseId);
    const request = project?.requests.find(({ id }) => id === requestId);
    if (!request) throw new Error("Заявка не найдена");

    const updated = { ...request, ...update(request) };
    cases = cases.map((item) => item === project ? {
      ...item,
      requests: item.requests.map((entry) => entry === request ? updated : entry),
    } : item);
    return updated;
  }

  return {
    async load() {
      return { cases, projects: exampleProjects };
    },
    async setRecruiting(caseId, recruiting) {
      cases = cases.map((item) => item.id === caseId ? { ...item, recruiting } : item);
      return recruiting;
    },
    async acceptRequest(caseId, requestId) {
      return updateRequest(caseId, requestId, () => ({ status: "accepted" }));
    },
    async declineRequest(caseId, requestId, reason) {
      return updateRequest(caseId, requestId, () => ({ status: "declined", reason }));
    },
    async scheduleTeam(caseId, requestId, draft) {
      return updateRequest(caseId, requestId, ({ team }) => ({
        status: "scheduled",
        team: { ...team, ...draft },
      }));
    },
    async updateTeam(caseId, requestId, draft) {
      return updateRequest(caseId, requestId, ({ team }) => ({
        team: { ...team, ...draft },
      }));
    },
  };
}
