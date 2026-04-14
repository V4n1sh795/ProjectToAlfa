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

### Endpoints

#### Аутентификация
| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/auth/register` | Регистрация нового пользователя |
| POST | `/auth/login` | Вход в систему |
| GET | `/auth/verify` | Проверка JWT токена |

#### Команды
| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/get_team` | Получить все команды |
| GET | `/team/{id}` | Получить команду по ID |
| POST | `/team` | Создать новую команду |

#### Участники
| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/members` | Получить всех участников |
| GET | `/member/{id}` | Получить участника по ID |

#### Кураторы
| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/curators` | Получить всех кураторов |
| GET | `/curator/{id}` | Получить куратора по ID |

#### Проекты
| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/project` | Получить все проекты |
| GET | `/project/{id}` | Получить проект по ID |
| POST | `/project` | Создать новый проект ⚠️ Требуется авторизация |

#### Встречи и задачи
| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/day/{date}` | Получить встречи за дату |
| GET | `/day/` | Получить все встречи |
| POST | `/task/{day}` | Создать задачу |
| POST | `/task/{taskId}` | Закрыть задачу |
| GET | `/task/{id}` | Получить задачу по ID |
| POST | `/meeting/comment/{meetingId}` | Добавить комментарий к встрече |

#### Сообщения
| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/message/{chat_id}` | Отправить сообщение |
| GET | `/message/{chat_id}` | Получить сообщения чата |

### Примеры запросов

#### Регистрация
```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Иван Петров",
    "email": "ivan@example.com",
    "password": "securePass123"
  }'
```

#### Вход
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ivan@example.com",
    "password": "securePass123"
  }'
```

#### Создание проекта (с авторизацией)
```bash
curl -X POST http://localhost:5000/project \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Новый проект",
    "teamId": 1,
    "description": "Описание проекта"
  }'
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
