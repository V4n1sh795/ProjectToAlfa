import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TelegramBotPage from "./TelegramBotPage";
import { createTelegramBotPreview } from "./telegramBotExamples";

function renderWorkspace(path = "/telegram-bot", dataSource) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/telegram-bot/*" element={<TelegramBotPage dataSource={dataSource} />} />
      </Routes>
    </MemoryRouter>,
  );
}

test("opens cases independently and changes recruitment for the selected case", async () => {
  renderWorkspace();
  const web = await screen.findByRole("button", { name: "Разработка Web-приложения" });
  const assistant = screen.getByRole("button", { name: "Разработка AI-ассистента" });
  expect(web).toHaveAttribute("aria-expanded", "false");
  expect(assistant).toHaveAttribute("aria-expanded", "true");

  fireEvent.click(web);
  expect(assistant).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByText("Записанных команд пока нет.")).toBeVisible();

  const mode = screen.getByRole("group", { name: "Набор команд: Разработка Web-приложения" });
  const stop = within(mode).getByRole("button", { name: "Стоп" });
  fireEvent.click(stop);
  await waitFor(() => expect(stop).toHaveAttribute("aria-pressed", "true"));
  expect(within(mode).getByRole("button", { name: "Набор" })).toHaveAttribute("aria-pressed", "false");
});

test("cancels a decline with Escape, then removes only the declined request after confirmation", async () => {
  renderWorkspace();
  const decline = await screen.findByRole("button", { name: "Отклонить" });
  fireEvent.click(decline);
  const reason = screen.getByRole("textbox", { name: /почему вы хотите отклонить/ });
  expect(reason).toHaveFocus();
  fireEvent.keyDown(reason, { key: "Escape" });
  expect(reason).not.toBeInTheDocument();
  expect(decline).toHaveFocus();

  fireEvent.click(decline);
  const form = screen.getByRole("form", { name: /почему вы хотите отклонить/ });
  const confirm = within(form).getByRole("button", { name: "Отклонить команду" });
  expect(confirm).toHaveAttribute("aria-disabled", "true");
  fireEvent.submit(form);
  expect(form).toBeInTheDocument();
  fireEvent.change(within(form).getByRole("textbox"), { target: { value: "Нужно уточнить состав" } });
  fireEvent.click(confirm);
  await waitFor(() => expect(form).not.toBeInTheDocument());
  expect(screen.getAllByRole("link", { name: "MeSu" })).toHaveLength(2);
});

test("opens the accepted team's filled form and applies the schedule locally", async () => {
  renderWorkspace();
  fireEvent.click(await screen.findByRole("button", { name: "Принять" }));
  const meetingLinks = await waitFor(() => {
    const links = screen.getAllByRole("link", { name: "Создать регулярную встречу" });
    expect(links).toHaveLength(2);
    return links;
  });
  fireEvent.click(meetingLinks[1]);
  expect(screen.getByRole("heading", { name: "Создание новой команды" })).toBeVisible();
  expect(screen.getByLabelText(/Название команды/)).toHaveValue("MeSu");
  expect(screen.getAllByRole("checkbox")).toHaveLength(4);

  fireEvent.click(screen.getByRole("button", { name: "День встречи" }));
  fireEvent.click(screen.getByRole("option", { name: "Понедельник" }));
  fireEvent.click(screen.getByRole("button", { name: "Время встречи" }));
  fireEvent.click(screen.getByRole("option", { name: "08:00" }));
  fireEvent.click(screen.getByRole("button", { name: "Создать команду" }));

  expect(await screen.findByRole("heading", { name: "MeSu" })).toBeVisible();
  expect(screen.getByText("Понедельник")).toBeVisible();
  expect(screen.getByText("08:00")).toBeVisible();
});

test("edits a team without scheduling a meeting and keeps the member IDs", async () => {
  const source = createTelegramBotPreview();
  const result = await source.load();
  const pending = result.cases[1].requests[2];
  pending.team.members[0].id = 81;
  pending.team.members[1].contact = null;
  const updateTeam = jest.spyOn(source, "updateTeam");
  renderWorkspace("/telegram-bot/team/pending/edit", source);

  const name = await screen.findByLabelText(/Название команды/);
  fireEvent.change(name, { target: { value: "Новая команда" } });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

  expect(await screen.findByRole("heading", { name: "Новая команда" })).toBeVisible();
  expect(updateTeam).toHaveBeenCalledWith("assistant", "pending", expect.objectContaining({
    callDay: "",
    callTime: "",
    members: expect.arrayContaining([expect.objectContaining({ id: 81 })]),
  }));
  expect((await source.load()).cases[1].requests[2].status).toBe("pending");
});

test("can retry a failed load and preserves the decline reason when saving fails", async () => {
  const source = createTelegramBotPreview();
  jest.spyOn(source, "load").mockRejectedValueOnce(new Error("Network error"));
  const declineRequest = jest.spyOn(source, "declineRequest").mockRejectedValueOnce(new Error("Network error"));
  renderWorkspace("/telegram-bot", source);

  expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось загрузить кейсы и заявки");
  fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
  fireEvent.click(await screen.findByRole("button", { name: "Отклонить" }));
  const form = screen.getByRole("form", { name: /почему вы хотите отклонить/ });
  const reason = within(form).getByRole("textbox");
  fireEvent.change(reason, { target: { value: " Нужно уточнить состав " } });
  fireEvent.submit(form);

  expect(await within(form).findByRole("alert")).toHaveTextContent("Не удалось отклонить команду");
  expect(reason).toHaveValue(" Нужно уточнить состав ");
  expect(screen.getAllByRole("link", { name: "MeSu" })).toHaveLength(3);
  fireEvent.submit(form);
  await waitFor(() => expect(form).not.toBeInTheDocument());
  expect(declineRequest).toHaveBeenLastCalledWith("assistant", "pending", "Нужно уточнить состав");
});
