// Local examples from the design. These IDs are never sent to a server.
export const exampleProjects = [
  { id: "web", name: "Разработка Web-приложения" },
  { id: "assistant", name: "Разработка AI-ассистента" },
];

const exampleMembers = [
  { name: "Зинатулин Тимур Аликович", group: "РИ-340944", role: "Тим-лид", stack: "YouGile", contact: "@coolguy67" },
  { name: "Мамонтов Никита Вячеславович", group: "РИ-340952", role: "Дизайнер", stack: "Figma", contact: "" },
  { name: "Мохов Евгений Иванович", group: "РИ-341488", role: "Аналитик", stack: "Google Docs, Yandex Datalens", contact: "" },
  { name: "Трифонов Данил Владимирович", group: "РИ-340969", role: "Бэкенд", stack: "Python, Django, JavaScript, Docker", contact: "" },
];

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
    },
  };
}

export function createExampleCases(showDeclineExample) {
  return [
    { ...exampleProjects[0], recruiting: true, requests: [] },
    {
      ...exampleProjects[1],
      recruiting: false,
      requests: [
        exampleRequest("in-progress", "scheduled"),
        exampleRequest("accepted", "accepted"),
        exampleRequest("pending", "pending"),
        ...(showDeclineExample ? [exampleRequest("decline-example", "pending")] : []),
      ],
    },
  ];
}
