
const mockApi = { get: jest.fn(), put: jest.fn(), post: jest.fn() };
jest.mock("axios", () => ({ __esModule: true, default: { create: () => mockApi } }));

const { createTelegramBotApi } = require("./telegramBotApi");

beforeEach(() => {
  mockApi.get.mockReset();
  mockApi.put.mockReset();
  mockApi.post.mockReset();
  localStorage.clear();
});

const team = { name: "T", projectId: 1, callDay: "", callTime: "", members: [], artifacts: "" };

test("load groups requests under their project and keeps the recruiting flag", async () => {
  localStorage.setItem("token", "jwt");
  mockApi.get.mockImplementation(async (path) => path === "/project"
    ? { data: [{ id: 1, name: "A", isRecruitmentOpen: true }, { id: 2, name: "B", isRecruitmentOpen: false }] }
    : { data: [{ id: 7, projectId: 2, status: "pending", date: "2026-11-30", reason: "", team }] });
  const result = await createTelegramBotApi().load({});
  expect(mockApi.get).toHaveBeenCalledWith("/telegram/requests", expect.objectContaining({ headers: { Authorization: "Bearer jwt" } }));
  expect(result.cases).toEqual([
    { id: 1, name: "A", recruiting: true, requests: [] },
    { id: 2, name: "B", recruiting: false, requests: [{ id: 7, status: "pending", date: "2026-11-30", reason: undefined, team }] },
  ]);
  expect(result.projects).toEqual([{ id: 1, name: "A" }, { id: 2, name: "B" }]);
});

test("setRecruiting sends the bearer token and returns the stored value", async () => {
  localStorage.setItem("token", "jwt");
  mockApi.put.mockResolvedValue({ data: { id: 2, isRecruitmentOpen: true } });
  await expect(createTelegramBotApi().setRecruiting(2, true)).resolves.toBe(true);
  expect(mockApi.put).toHaveBeenCalledWith(
    "/projects/2/recruitment",
    { isRecruitmentOpen: true },
    { headers: { Authorization: "Bearer jwt" } },
  );
});

test("accept and decline post to the request and return the updated request", async () => {
  mockApi.post.mockResolvedValue({ data: { id: 7, status: "declined", date: "2026-11-30", reason: "нет", team } });
  const source = createTelegramBotApi();
  const declined = await source.declineRequest(2, 7, "нет");
  expect(mockApi.post).toHaveBeenCalledWith("/telegram/requests/7/decline", { reason: "нет" }, expect.anything());
  expect(declined).toMatchObject({ id: 7, status: "declined", reason: "нет" });
  await source.acceptRequest(2, 7);
  expect(mockApi.post).toHaveBeenCalledWith("/telegram/requests/7/accept", undefined, expect.anything());
});

test("scheduleTeam and updateTeam send the team draft", async () => {
  const draft = { name: "T", projectId: "2", callDay: "Monday", callTime: "11:00",
    members: [{ id: 5, name: "А Б В", group: "Г", role: "Р", stack: "С", contact: "", exists: true }] };
  const body = { name: "T", projectId: 2, callDay: "Monday", callTime: "11:00",
    members: [{ name: "А Б В", group: "Г", role: "Р", stack: "С", contact: "" }] };
  mockApi.post.mockResolvedValue({ data: { id: 7, status: "scheduled", date: null, team } });
  mockApi.put.mockResolvedValue({ data: { id: 7, status: "scheduled", date: null, team } });
  const source = createTelegramBotApi();
  await source.scheduleTeam(2, 7, draft);
  expect(mockApi.post).toHaveBeenCalledWith("/telegram/requests/7/schedule", body, expect.anything());
  await source.updateTeam(2, 7, draft);
  expect(mockApi.put).toHaveBeenCalledWith("/telegram/requests/7", body, expect.anything());
});
