
const mockApi = { get: jest.fn(), put: jest.fn() };
jest.mock("axios", () => ({ __esModule: true, default: { create: () => mockApi } }));

const { createTelegramBotApi } = require("./telegramBotApi");

beforeEach(() => {
  mockApi.get.mockReset();
  mockApi.put.mockReset();
  localStorage.clear();
});

test("load maps projects to cases with the stored recruiting flag", async () => {
  mockApi.get.mockResolvedValue({ data: [
    { id: 1, name: "A", isRecruitmentOpen: true },
    { id: 2, name: "B", isRecruitmentOpen: false },
  ] });
  const result = await createTelegramBotApi().load({});
  expect(mockApi.get).toHaveBeenCalledWith("/project", expect.anything());
  expect(result.cases).toEqual([
    { id: 1, name: "A", recruiting: true, requests: [] },
    { id: 2, name: "B", recruiting: false, requests: [] },
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

test("request mutations are rejected until the server supports them", async () => {
  await expect(createTelegramBotApi().acceptRequest(1, 1)).rejects.toThrow();
});
