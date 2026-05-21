# ProjectToAlfa

Система управления проектами и встречами команд для взаимодействия с университетами и Альфа-Банком.

## 📋 Описание

ProjectToAlfa — это веб-приложение для администрирования проектов, включающее:
- **Backend** на ASP.NET Core (Web API)
- **Frontend** на React + TypeScript
- **Базу данных** PostgreSQL
- **Nginx** в качестве reverse proxy

### Основные возможности

- 🔐 Аутентификация и авторизация пользователей (JWT)
- 👥 Управление командами и участниками
- 📅 Планирование встреч и задач
- 💬 Система комментариев и сообщений
- 📊 Отслеживание прогресса проектов
- 👨‍🏫 Управление кураторами проектов

## 🏗️ Архитектура

```
ProjectToAlfa/
├── cash/              # Backend (ASP.NET Core)
├── frontend/          # Frontend (React + TypeScript)
├── nginx/             # Конфигурация Nginx
├── docs/              # OpenAPI спецификации
└── docker-compose.yml # Оркестрация контейнеров
```

## 🚀 Быстрый старт

### Требования

- Docker и Docker Compose
- .NET 8 SDK (для локальной разработки backend)
- Node.js 16+ (для локальной разработки frontend)

### Запуск через Docker Compose

1. Создайте файл `.env` в корневой директории:

```bash
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=your_database
```

2. Запустите все сервисы:

```bash
docker-compose up -d
```

3. Приложение будет доступно по адресу: `http://localhost:80`

### Локальная разработка

#### Backend

```bash
cd cash

# Установите зависимости
dotnet restore

# Настройте строку подключения в appsettings.Development.json

# Запустите миграции
dotnet ef database update

# Запустите сервер
dotnet run
```

Backend доступен по адресу: `http://localhost:5000`

#### Frontend

```bash
cd frontend

# Установите зависимости
npm install

# Запустите dev-сервер
npm start
```

Frontend доступен по адресу: `http://localhost:3000`

## 📡 API Документация

API построено на ASP.NET Core с использованием минимальных API (Minimal API). Все запросы выполняются к базовому URL сервера (по умолчанию `http://localhost:5000` или `http://localhost:8080` в Docker).

### Общие сведения

- **Формат данных**: JSON
- **Аутентификация**: JWT Bearer Token
- **Заголовок авторизации**: `Authorization: Bearer <token>`

---

### 🔐 Аутентификация

| Метод | Endpoint | Описание | Требуется авторизация |
|-------|----------|----------|----------------------|
| POST | `/auth/register` | Регистрация нового куратора | ❌ |
| POST | `/auth/login` | Вход в систему, получение JWT токена | ❌ |
| GET | `/auth/verify` | Проверка валидности JWT токена | ✅ |

#### Регистрация пользователя

**POST** `/auth/register`

**Request Body:**
```json
{
  "name": "Иван Петров",
  "email": "ivan@example.com",
  "password": "securePass123"
}
```

**Response (200 OK):**
```json
{
  "messgae": "Регистрация успешна",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "id": 1,
  "user_name": "Иван Петров"
}
```

#### Вход в систему

**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "ivan@example.com",
  "password": "securePass123"
}
```

**Response (200 OK):**
```json
{
  "messgae": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "id": 1,
  "user_name": "Иван Петров"
}
```

#### Проверка токена

**GET** `/auth/verify`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response (200 OK):**
```
Token is valid
```

---

### 👥 Команды

| Метод | Endpoint | Описание | Требуется авторизация |
|-------|----------|----------|----------------------|
| GET | `/get_team` | Получить все команды | ❌ |
| GET | `/team/{id}` | Получить команду по ID | ❌ |
| POST | `/team` | Создать новую команду | ❌ |

#### Получить все команды

**GET** `/get_team`

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Команда А",
    "project_id": 1,
    "curators": [1, 2],
    "call_day": "Monday",
    "call_time": "14:00",
    ...
  }
]
```

#### Получить команду по ID

**GET** `/team/{id}`

**Path Parameters:**
- `id` (int) — ID команды

**Response (200 OK):**
```json
{
  "name": "Команда А",
  "project": [1, "Название проекта"],
  "members": [[1, "Иванов Иван Иванович"], [2, "Петров Петр Петрович"]],
  "curators": [[1, "Куратор 1"], [2, "Куратор 2"]],
  "callDay": "Monday",
  "callTime": "14:00"
}
```

#### Создать команду

**POST** `/team`

**Request Body:**
```json
{
  "callDay": "Понедельник",
  "callTime": "14:00",
  "curators": [1, 2],
  "members_l": [
    {
      "name": "Иванов Иван Иванович",
      "group": "Группа 1",
      "role": "Разработчик",
      "stack": "React, Node.js"
    }
  ],
  "name": "Новая команда",
  "projectId": 1
}
```

**Response (200 OK):**
```
OK
```

---

### 👤 Участники (Members)

| Метод | Endpoint | Описание | Требуется авторизация |
|-------|----------|----------|----------------------|
| GET | `/members` | Получить всех участников | ❌ |
| GET | `/member/{id}` | Получить участника по ID | ❌ |

#### Получить всех участников

**GET** `/members`

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Иван",
    "surname": "Иванов",
    "second_name": "Иванович",
    "profiles": [...],
    "team_id": 1
  }
]
```

#### Получить участника по ID

**GET** `/member/{id}`

**Path Parameters:**
- `id` (int) — ID участника

---

### 🎓 Кураторы

| Метод | Endpoint | Описание | Требуется авторизация |
|-------|----------|----------|----------------------|
| GET | `/curators` | Получить всех кураторов | ❌ |
| GET | `/curator/{id}` | Получить куратора по ID | ❌ |

#### Получить всех кураторов

**GET** `/curators`

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Куратор 1",
    "email": "curator1@example.com"
  }
]
```

#### Получить куратора по ID

**GET** `/curator/{id}`

**Path Parameters:**
- `id` (int) — ID куратора

---

### 📁 Проекты

| Метод | Endpoint | Описание | Требуется авторизация |
|-------|----------|----------|----------------------|
| GET | `/project` | Получить все проекты | ❌ |
| GET | `/project/{id}` | Получить проект по ID | ❌ |
| GET | `/cproject/{cur_id}` | Получить проекты куратора | ❌ |
| POST | `/project` | Создать новый проект | ❌ |

#### Получить все проекты

**GET** `/project`

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Проект 1",
    "description": "Описание",
    "main_Goal": "Цель",
    "results": "Результаты",
    "roles": "Роли",
    "technology": "Технологии",
    "curatorIds": [1, 2],
    "startDate": "2024-01-01",
    "endDate": "2024-06-01",
    "semester": "Весна 2024"
  }
]
```

#### Получить проект по ID

**GET** `/project/{id}`

**Path Parameters:**
- `id` (int) — ID проекта

**Response (200 OK):**
```json
{
  "name": "Проект 1",
  "description": "Описание",
  "main_Goal": "Цель",
  "results": "Результаты",
  "roles": "Роли",
  "technology": "Технологии",
  "curators": [[1, "Куратор 1"], [2, "Куратор 2"]],
  "teams": [[1, "Команда А"]],
  "startDate": "2024-01-01",
  "endDate": "2024-06-01",
  "semester": "Весна 2024"
}
```

#### Создать проект

**POST** `/project`

**Request Body:**
```json
{
  "name": "Новый проект",
  "description": "Описание проекта",
  "main_Goal": "Главная цель",
  "results": "Ожидаемые результаты",
  "roles": "Необходимые роли",
  "technology": "Стек технологий",
  "startDate": "2024-01-01",
  "endDate": "2024-06-01",
  "curators": ["1", "2"],
  "semester": "Весна 2024"
}
```

---

### 📅 Встречи

| Метод | Endpoint | Описание | Требуется авторизация |
|-------|----------|----------|----------------------|
| GET | `/day/{date}` | Получить встречи за дату | ❌ |
| GET | `/day/` | Получить все встречи | ❌ |
| GET | `/week/{monday_date}` | Получить встречи за неделю | ❌ |
| POST | `/meeting/comment/{meetingId}` | Добавить комментарий к встрече | ❌ |
| POST | `/meeting/status/{id}` | Установить статус встречи | ❌ |
| GET | `/meeting/curators/{id}` | Получить кураторов встречи | ❌ |
| GET | `/meeting/members/{id}` | Получить участников встречи | ❌ |
| POST | `/meeting/curators/{id}` | Добавить кураторов во встречу | ❌ |
| POST | `/meeting/members/{id}` | Добавить участников во встречу | ❌ |

#### Получить встречи за дату

**GET** `/day/{date}`

**Path Parameters:**
- `date` (datetime) — Дата в формате ISO 8601

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "date": "2024-01-15T00:00:00Z",
    "time": "14:00:00",
    "teamId": 1,
    "status": "Запланирована",
    "tasks": [1, 2],
    "comments": []
  }
]
```

#### Получить все встречи

**GET** `/day/`

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "date": "2024-01-15T00:00:00Z",
    "time": "14:00:00",
    "teamId": 1,
    ...
  }
]
```

#### Получить встречи за неделю

**GET** `/week/{monday_date}`

**Path Parameters:**
- `monday_date` (datetime) — Дата понедельника недели

**Response (200 OK):**
```json
[
  {
    "teamName": "Команда А",
    "caseName": "Проект 1",
    "date": "2024-01-15T00:00:00Z",
    "startAt": "14:00:00",
    "status": "Запланирована",
    "participants": ["Иванов И.И.", "Петров П.П."]
  }
]
```

#### Добавить комментарий к встрече

**POST** `/meeting/comment/{meetingId}`

**Path Parameters:**
- `meetingId` (int) — ID встречи

**Request Body:**
```json
{
  "text": "Текст комментария"
}
```

#### Установить статус встречи

**POST** `/meeting/status/{id}`

**Path Parameters:**
- `id` (string) — ID встречи

**Request Body:**
```json
{
  "status": "Проведена"
}
```

#### Получить кураторов встречи

**GET** `/meeting/curators/{id}`

**Path Parameters:**
- `id` (int) — ID встречи

**Response (200 OK):**
```json
["Куратор 1", "Куратор 2"]
```

#### Получить участников встречи

**GET** `/meeting/members/{id}`

**Path Parameters:**
- `id` (int) — ID встречи

**Response (200 OK):**
```json
["Иванов Иван Иванович", "Петров Петр Петрович"]
```

#### Добавить кураторов во встречу

**POST** `/meeting/curators/{id}`

**Path Parameters:**
- `id` (int) — ID встречи

**Request Body:**
```json
[1, 2, 3]
```

#### Добавить участников во встречу

**POST** `/meeting/members/{id}`

**Path Parameters:**
- `id` (int) — ID встречи

**Request Body:**
```json
[1, 2, 3]
```

---

### ✅ Задачи

| Метод | Endpoint | Описание | Требуется авторизация |
|-------|----------|----------|----------------------|
| POST | `/task/{day}` | Создать задачу | ❌ |
| POST | `/task/{taskId}` | Закрыть задачу | ❌ |
| GET | `/task/{id}` | Получить задачу по ID | ❌ |

#### Создать задачу

**POST** `/task/{day}`

**Path Parameters:**
- `day` (datetime) — Дата создания задачи

**Request Body:**
```json
{
  "teamId": 1,
  "name": "Название задачи",
  "deadline": "2024-02-01"
}
```

#### Закрыть задачу

**POST** `/task/{taskId}`

**Path Parameters:**
- `taskId` (int) — ID задачи

**Response (200 OK):**
```
OK
```

#### Получить задачу по ID

**GET** `/task/{id}`

**Path Parameters:**
- `id` (int) — ID задачи

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "status": true,
    "startline": "2024-01-15T00:00:00Z",
    "deadline": "2024-02-01T00:00:00Z",
    "name": "Название задачи"
  }
]
```

---

### 💬 Сообщения

| Метод | Endpoint | Описание | Требуется авторизация |
|-------|----------|----------|----------------------|
| POST | `/message/{chat_id}` | Отправить сообщение | ❌ |
| GET | `/message/{chat_id}` | Получить сообщения чата | ❌ |

#### Отправить сообщение

**POST** `/message/{chat_id}`

**Path Parameters:**
- `chat_id` (int) — ID чата

**Request Body:**
```json
{
  "user_id": 1,
  "user_text": "Текст сообщения",
  "user_name": "Имя отправителя"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "chat_id": 1,
  "sender_id": 1,
  "sender_name": "Имя отправителя",
  "text": "Текст сообщения",
  "createdAt": "2024-01-15T12:00:00Z"
}
```

#### Получить сообщения чата

**GET** `/message/{chat_id}`

**Path Parameters:**
- `chat_id` (int) — ID чата

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "chat_id": 1,
    "sender_id": 1,
    "sender_name": "Имя отправителя",
    "text": "Текст сообщения",
    "createdAt": "2024-01-15T12:00:00Z"
  }
]
```

---

### 🔍 Поиск

| Метод | Endpoint | Описание | Требуется авторизация |
|-------|----------|----------|----------------------|
| GET | `/find/{entity}` | Поиск по сущностям | ❌ |

#### Поиск по сущностям

**GET** `/find/{entity}?query=<search_query>`

**Path Parameters:**
- `entity` (string) — Тип сущности: `project`, `team`, `member`, `curator`

**Query Parameters:**
- `query` (string, optional) — Поисковый запрос

**Поддерживаемые сущности:**
- `project`, `projects` — поиск по названию, описанию, семестру
- `team`, `teams` — поиск по названию команды
- `member`, `members`, `student`, `students` — поиск по ФИО
- `curator`, `curators` — поиск по имени и email

**Примеры:**
```bash
# Поиск проектов
curl "http://localhost:5000/find/project?query=Банк"

# Поиск участников
curl "http://localhost:5000/find/member?query=Иванов"

# Поиск всех кураторов (без query)
curl "http://localhost:5000/find/curators"
```

---

### 🗄️ Профили

| Метод | Endpoint | Описание | Требуется авторизация |
|-------|----------|----------|----------------------|
| GET | `/profiles` | Получить все профили участников | ❌ |

---

### 🔧 Администрирование

| Метод | Endpoint | Описание | Требуется авторизация |
|-------|----------|----------|----------------------|
| GET | `/admin/fill-db` | Заполнить базу тестовыми данными | ❌ |

#### Заполнение базы тестовыми данными

**GET** `/admin/fill-db`

**Response (200 OK):**
```
Database filled successfully!
```

---

### Примеры запросов cURL

#### Регистрация нового пользователя
```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Иван Петров",
    "email": "ivan@example.com",
    "password": "securePass123"
  }'
```

#### Вход в систему
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ivan@example.com",
    "password": "securePass123"
  }'
```

#### Создание проекта
```bash
curl -X POST http://localhost:5000/project \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Новый проект",
    "description": "Описание проекта",
    "main_Goal": "Главная цель",
    "results": "Ожидаемые результаты",
    "roles": "Разработчики",
    "technology": ".NET, React",
    "startDate": "2024-01-01",
    "endDate": "2024-06-01",
    "curators": ["1", "2"],
    "semester": "Весна 2024"
  }'
```

#### Создание команды
```bash
curl -X POST http://localhost:5000/team \
  -H "Content-Type: application/json" \
  -d '{
    "callDay": "Понедельник",
    "callTime": "14:00",
    "curators": [1, 2],
    "members_l": [
      {
        "name": "Иванов Иван Иванович",
        "group": "Группа 1",
        "role": "Backend разработчик",
        "stack": ".NET, PostgreSQL"
      }
    ],
    "name": "Команда Альфа",
    "projectId": 1
  }'
```

#### Отправка сообщения
```bash
curl -X POST http://localhost:5000/message/1 \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "user_text": "Привет, команда!",
    "user_name": "Иван"
  }'
```

#### Поиск проектов
```bash
curl "http://localhost:5000/find/project?query=Альфа"
```

## 🗄️ База данных

Проект использует PostgreSQL с Entity Framework Core для миграций.

### Модели данных

- **Team** — Команда проекта
- **Member** — Участник команды
- **Curator** — Куратор проекта
- **Project** — Проект
- **Meeting** — Встреча команды
- **Task** — Задача
- **Message** — Сообщение в чате

### Применение миграций

```bash
cd cash
dotnet ef database update
```

## 🔧 Конфигурация

### Переменные окружения

| Переменная | Описание | Значение по умолчанию |
|------------|----------|----------------------|
| `POSTGRES_USER` | Пользователь PostgreSQL | - |
| `POSTGRES_PASSWORD` | Пароль PostgreSQL | - |
| `POSTGRES_DB` | Имя базы данных | - |
| `ASPNETCORE_ENVIRONMENT` | Среда выполнения | `Production` |

### Строка подключения

Для backend требуется строка подключения к PostgreSQL в формате:
```
Host=postgres_containerv3;Database={POSTGRES_DB};Username={POSTGRES_USER};Password={POSTGRES_PASSWORD}
```

## 📦 Структура проекта

### Backend (`cash/`)

```
cash/
├── Models/           # Модели данных EF Core
├── Service/          # Бизнес-логика и обработчики запросов
├── Migrations/       # Миграции базы данных
├── Program.cs        # Точка входа и конфигурация
├── appsettings.json  # Конфигурация приложения
└── Dockerfile        # Docker образ backend
```

### Frontend (`frontend/`)

```
frontend/
├── src/              # Исходный код React
├── public/           # Статические файлы
├── package.json      # Зависимости npm
├── tsconfig.json     # Конфигурация TypeScript
├── Dockerfile        # Dev Docker образ
└── ProdDockerfile    # Production Docker образ (nginx)
```

## 🛠️ Технологии

### Backend
- ASP.NET Core 8
- Entity Framework Core
- PostgreSQL (Npgsql)
- JWT Authentication
- Swagger/OpenAPI

### Frontend
- React 19
- TypeScript
- React Router DOM
- Axios

### Инфраструктура
- Docker & Docker Compose
- Nginx
- PostgreSQL 17

## 🧪 Тестирование

### Backend
```bash
cd cash
dotnet test
```

### Frontend
```bash
cd frontend
npm test
```

## 📝 Лицензия

MIT

## 👥 Контакты

- Email: support@cash.local
- Документация API: `/docs/`

## 🤝 Вклад в проект

1. Fork репозиторий
2. Создайте ветку (`git checkout -b feature/AmazingFeature`)
3. Закоммитьте изменения (`git commit -m 'Add some AmazingFeature'`)
4. Push в ветку (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

---

**Статус проекта:** В разработке 🚧
