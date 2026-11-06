from pydantic import BaseModel, ConfigDict, Field, field_validator

# Допустимая длина полей ответа модели (Requirements.md 3.4).
LIMITS = {
    "title": (1, 100),
    "description": (150, 450),
    "goal": (80, 350),
    "result": (80, 350),
}
FIELDS = tuple(LIMITS)


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ProjectCase(StrictModel):
    """Ответ модели: поля строго в заданных диапазонах длины."""

    title: str
    description: str
    goal: str
    result: str

    @field_validator(*FIELDS)
    @classmethod
    def _check_length(cls, value: str, info) -> str:
        value = value.strip()
        low, high = LIMITS[info.field_name]
        if not low <= len(value) <= high:
            raise ValueError(f"{info.field_name}: длина должна быть {low}-{high}")
        return value


class GenerateCasesResult(StrictModel):
    cases: list[ProjectCase] = Field(min_length=3, max_length=3)


class RefineCaseResult(StrictModel):
    updatedCase: ProjectCase
    assistantMessage: str = Field(min_length=1, max_length=400)

    @field_validator("assistantMessage")
    @classmethod
    def _strip(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("пустое сообщение")
        return value


# ---- запросы ----

class DraftCase(BaseModel):
    """Черновик от клиента: поля могут быть пустыми (куратор очистил поле)."""

    model_config = ConfigDict(extra="ignore")
    title: str = Field(max_length=2000)
    description: str = Field(max_length=5000)
    goal: str = Field(max_length=5000)
    result: str = Field(max_length=5000)


class GenerateCasesRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    userPrompt: str = Field(default="", max_length=500)

    @field_validator("userPrompt")
    @classmethod
    def _strip(cls, value: str) -> str:
        return value.strip()


class RefineCaseRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    currentCase: DraftCase
    userInstruction: str = Field(max_length=500)

    @field_validator("userInstruction")
    @classmethod
    def _strip(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("userInstruction не может быть пустым")
        return value
