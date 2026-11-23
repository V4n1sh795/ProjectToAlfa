import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TelegramBotPage from "./TelegramBotPage";

function renderWorkspace(path = "/telegram-bot") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/telegram-bot/*" element={<TelegramBotPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

test("opens cases independently and changes recruitment for the selected case", () => {
  renderWorkspace();
  const web = screen.getByRole("button", { name: "Разработка Web-приложения" });
  const assistant = screen.getByRole("button", { name: "Разработка AI-ассистента" });
  expect(web).toHaveAttribute("aria-expanded", "false");
  expect(assistant).toHaveAttribute("aria-expanded", "true");

  fireEvent.click(web);
  expect(assistant).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByText("Записанных команд пока нет.")).toBeVisible();

  const mode = screen.getByRole("group", { name: "Набор команд: Разработка Web-приложения" });
  const stop = within(mode).getByRole("button", { name: "Стоп" });
  fireEvent.click(stop);
  expect(stop).toHaveAttribute("aria-pressed", "true");
  expect(within(mode).getByRole("button", { name: "Набор" })).toHaveAttribute("aria-pressed", "false");
});

test("cancels a decline with Escape, then removes only the declined request after confirmation", () => {
  renderWorkspace();
  const decline = screen.getByRole("button", { name: "Отклонить" });
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
  expect(form).not.toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "MeSu" })).toHaveLength(2);
});

test("opens the accepted team's filled form and applies the schedule locally", async () => {
  renderWorkspace();
  fireEvent.click(screen.getByRole("button", { name: "Принять" }));
  const meetingLinks = screen.getAllByRole("link", { name: "Создать регулярную встречу" });
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
