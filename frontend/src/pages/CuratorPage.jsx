import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { getCurator, getTeams, updateCuratorCard } from "../api/meetingsApi";
import "./css/CuratorPage.css";
import editIcon from "../assets/icons/edit.svg";

const emptyValue = "Не указано";

const getValue = (source, names, fallback = "") => {
  if (!source) return fallback;

  for (const name of names) {
    if (
      source[name] !== undefined &&
      source[name] !== null &&
      source[name] !== ""
    ) {
      return source[name];
    }
  }

  return fallback;
};

const normalizeKeyValue = (item) => ({
  key: getValue(item, ["key", "Key", "id", "Id"], null),
  value: getValue(item, ["value", "Value", "name", "Name"], ""),
});

const normalizeList = (items) => {
  if (!Array.isArray(items)) return [];

  return items.map((item) => {
    if (typeof item === "string") {
      return { id: null, name: item };
    }

    const pair = normalizeKeyValue(item);
    return {
      id: pair.key,
      name: pair.value || emptyValue,
    };
  });
};

const createDraftTeam = (team) => ({
  id: team.id ?? null,
  name: team.name || "",
});

const normalizeTeamOptions = (items) =>
  normalizeList(items).filter((team) => team.id !== null && team.name);

const TeamDropdown = ({
  id,
  value,
  options,
  placeholder,
  isOpen,
  onChange,
  onToggle,
}) => {
  const selectedTeam = options.find((team) => String(team.id) === String(value));

  return (
    <div className={`curator-team-select ${isOpen ? "is-open" : ""}`}>
      <button
        className="curator-team-select__button"
        type="button"
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedTeam?.name || placeholder}</span>
        <span className="curator-team-select__arrow" />
      </button>

      {isOpen && (
        <div className="curator-team-select__menu" role="listbox">
          <button
            className={`curator-team-select__option ${
              value ? "" : "is-selected"
            }`}
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => onChange("")}
          >
            {placeholder}
          </button>
          {options.map((team) => (
            <button
              className={`curator-team-select__option ${
                String(team.id) === String(value) ? "is-selected" : ""
              }`}
              key={`${id}-${team.id}`}
              type="button"
              role="option"
              aria-selected={String(team.id) === String(value)}
              onClick={() => onChange(String(team.id))}
            >
              {team.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CuratorPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const initialCurator = location.state?.curator;

  const [curator, setCurator] = useState(initialCurator || null);
  const [loading, setLoading] = useState(!initialCurator);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [savedCard, setSavedCard] = useState(null);
  const [draftCard, setDraftCard] = useState(null);
  const [teamOptions, setTeamOptions] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const cardRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const loadCurator = async () => {
      setLoading(true);
      setError("");

      try {
        const [curatorData, teamsData] = await Promise.all([
          getCurator(id),
          getTeams().catch(() => []),
        ]);
        if (cancelled) return;

        setCurator({ ...initialCurator, ...curatorData });
        setTeamOptions(normalizeTeamOptions(teamsData));
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError.response?.data?.message ||
              loadError.message ||
              "Не удалось загрузить карточку куратора",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCurator();

    return () => {
      cancelled = true;
    };
  }, [id, initialCurator]);

  useEffect(() => {
    if (!openDropdown) return undefined;

    const closeDropdown = (event) => {
      if (event.target.closest?.(".curator-team-select")) return;
      setOpenDropdown(null);
    };

    document.addEventListener("mousedown", closeDropdown);
    return () => document.removeEventListener("mousedown", closeDropdown);
  }, [openDropdown]);

  const curatorName = getValue(curator, ["name", "Name"], "Куратор");
  const email = getValue(curator, ["email", "Email"], emptyValue);
  const currentTeams = normalizeList(getValue(curator, ["teams", "Teams"], []));
  const pastTeams = normalizeList(
    getValue(
      curator,
      ["pastTeams", "PastTeams", "previousTeams", "PreviousTeams"],
      [],
    ),
  );

  const cardData = useMemo(
    () =>
      savedCard || {
        id,
        name: curatorName,
        email,
        currentTeams: currentTeams.map(createDraftTeam),
        pastTeams: pastTeams.map(createDraftTeam),
      },
    [currentTeams, curatorName, email, id, pastTeams, savedCard],
  );

  const startEditing = () => {
    setDraftCard(JSON.parse(JSON.stringify(cardData)));
    setSaveError("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraftCard(JSON.parse(JSON.stringify(cardData)));
    setSaveError("");
    setOpenDropdown(null);
    setIsEditing(false);
  };

  const updateDraft = (field, value) => {
    setDraftCard((prev) => ({ ...prev, [field]: value }));
  };

  const updateTeam = (listName, index, value) => {
    const selectedTeam = teamOptions.find((team) => String(team.id) === value);

    setDraftCard((prev) => ({
      ...prev,
      [listName]: prev[listName].map((team, teamIndex) =>
        teamIndex === index
          ? {
              id: selectedTeam?.id ?? null,
              name: selectedTeam?.name || "",
            }
          : team,
      ),
    }));
    setOpenDropdown(null);
  };

  const addTeam = (listName) => {
    setDraftCard((prev) => ({
      ...prev,
      [listName]: [...prev[listName], { id: null, name: "" }],
    }));
  };

  const removeTeam = (listName, index) => {
    setDraftCard((prev) => ({
      ...prev,
      [listName]: prev[listName].filter((_, teamIndex) => teamIndex !== index),
    }));
  };

  const buildCuratorPatchPayload = (card) => ({
    id,
    name: String(card.name || "").trim(),
    email: String(card.email || "").trim(),
    teams: card.currentTeams.map((team) => ({
      id: team.id,
      name: String(team.name || "").trim(),
    })),
    pastTeams: card.pastTeams.map((team) => ({
      id: team.id,
      name: String(team.name || "").trim(),
    })),
  });

  const getTeamSelectOptions = (selectedTeams, currentTeamId) => {
    const selectedOptions = selectedTeams.filter((team) => team.id !== null && team.name);
    const selectedIds = new Set(
      selectedTeams
        .map((team) => (team.id === null ? null : String(team.id)))
        .filter((teamId) => teamId && teamId !== String(currentTeamId)),
    );
    const optionsById = new Map();

    [...selectedOptions, ...teamOptions]
      .filter((team) => !selectedIds.has(String(team.id)))
      .forEach((team) => {
      optionsById.set(String(team.id), team);
    });

    return [...optionsById.values()];
  };

  const saveDraft = async (event) => {
    event.preventDefault();
    const payload = buildCuratorPatchPayload(draftCard);

    setIsSaving(true);
    setSaveError("");

    try {
      const updatedCurator = await updateCuratorCard(id, payload);
      const nextCard = {
        ...draftCard,
        name: payload.name,
        email: payload.email,
        currentTeams: payload.teams,
        pastTeams: payload.pastTeams,
      };

      setSavedCard(nextCard);
      if (updatedCurator) {
        setCurator((prev) => ({ ...prev, ...updatedCurator }));
      }
      setIsEditing(false);
    } catch (saveError) {
      setSaveError(
        saveError.response?.data?.message ||
          saveError.message ||
          "Не удалось сохранить изменения куратора",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="curator-page-state">Загрузка...</div>;
  }

  if (error) {
    return <div className="curator-page-state">{error}</div>;
  }

  return (
    <div className="curator-page">
      <article
        className={`curator-card ${isEditing ? "curator-card-editing" : ""}`}
        ref={cardRef}
      >
        <h1>{cardData.name}</h1>

        {isEditing && draftCard ? (
          <form className="curator-edit-form" onSubmit={saveDraft}>
            <label className="curator-edit-field">
              <span>E-mail</span>
              <input
                type="text"
                value={draftCard.email}
                onChange={(event) => updateDraft("email", event.target.value)}
              />
            </label>

            <div className="curator-edit-grid">
              <section className="curator-edit-list">
                <h2>Команды в ведении</h2>
                {draftCard.currentTeams.map((team, index) => (
                  <div className="curator-edit-row" key={`current-${team.id ?? index}`}>
                    <TeamDropdown
                      id={`current-${index}`}
                      value={team.id ?? ""}
                      options={getTeamSelectOptions(draftCard.currentTeams, team.id)}
                      placeholder="Выберите команду"
                      isOpen={openDropdown === `current-${index}`}
                      onToggle={() =>
                        setOpenDropdown((current) =>
                          current === `current-${index}` ? null : `current-${index}`,
                        )
                      }
                      onChange={(value) => updateTeam("currentTeams", index, value)}
                    />
                    <button
                      className="curator-remove-button"
                      type="button"
                      onClick={() => removeTeam("currentTeams", index)}
                      aria-label="Удалить команду"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  className="curator-add-button"
                  type="button"
                  onClick={() => addTeam("currentTeams")}
                >
                  + Добавить команду
                </button>
              </section>

              <section className="curator-edit-list">
                <h2>Прошлые команды</h2>
                {draftCard.pastTeams.map((team, index) => (
                  <div className="curator-edit-row" key={`past-${team.id ?? index}`}>
                    <TeamDropdown
                      id={`past-${index}`}
                      value={team.id ?? ""}
                      options={getTeamSelectOptions(draftCard.pastTeams, team.id)}
                      placeholder="Выберите команду"
                      isOpen={openDropdown === `past-${index}`}
                      onToggle={() =>
                        setOpenDropdown((current) =>
                          current === `past-${index}` ? null : `past-${index}`,
                        )
                      }
                      onChange={(value) => updateTeam("pastTeams", index, value)}
                    />
                    <button
                      className="curator-remove-button"
                      type="button"
                      onClick={() => removeTeam("pastTeams", index)}
                      aria-label="Удалить команду"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  className="curator-add-button"
                  type="button"
                  onClick={() => addTeam("pastTeams")}
                >
                  + Добавить команду
                </button>
              </section>
            </div>

            {saveError && <p className="curator-save-error">{saveError}</p>}

            <div className="curator-edit-actions">
              <button
                className="curator-cancel-button"
                type="button"
                onClick={cancelEditing}
                disabled={isSaving}
              >
                Отменить изменения
              </button>
              <button
                className="curator-save-button"
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <section className="curator-info-block">
              <span>E-mail</span>
              <strong>{cardData.email}</strong>
            </section>

            <section className="curator-info-block">
              <span>Команды в ведении</span>
              {cardData.currentTeams.length > 0 ? (
                cardData.currentTeams.map((team, index) => (
                  <strong key={`${team.id ?? team.name}-${index}`}>
                    {team.name || emptyValue}
                  </strong>
                ))
              ) : (
                <strong>{emptyValue}</strong>
              )}
            </section>

            <section className="curator-info-block">
              <span>Прошлые команды</span>
              {cardData.pastTeams.length > 0 ? (
                cardData.pastTeams.map((team, index) => (
                  <strong key={`${team.id ?? team.name}-${index}`}>
                    {team.name || emptyValue}
                  </strong>
                ))
              ) : (
                <strong>{emptyValue}</strong>
              )}
            </section>

            <button
              className="curator-edit-button"
              type="button"
              onClick={startEditing}
            >
              Редактировать
              <img src={editIcon} alt="" className="curator-edit-icon" />
            </button>
          </>
        )}
      </article>
    </div>
  );
};

export default CuratorPage;
