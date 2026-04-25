using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace cash.Scripts;

/// <summary>
/// Скрипт для заполнения БД через API эндпоинты
/// <summary>
public static class FillerDB
{
    private static readonly HttpClient _httpClient = new HttpClient();
    private static readonly Random _random = new Random();
    private static string _baseUrl = "http://0.0.0.0:8080";
    private static string? _jwtToken;
    
    // БАЗЫ ДАННЫХ ДЛЯ РАНДОМИЗАЦИИ
    
    // Фамилии
    private static readonly List<string> _surnames = new()
    {
        "Иванов", "Петров", "Сидоров", "Смирнов", "Кузнецов", "Попов", "Васильев", "Соколов",
        "Михайлов", "Новиков", "Фёдоров", "Морозов", "Волков", "Алексеев", "Лебедев", "Семёнов",
        "Егоров", "Павлов", "Козлов", "Степанов", "Николаев", "Орлов", "Андреев", "Макаров"
    };
    
    // Имена
    private static readonly List<string> _names = new()
    {
        "Александр", "Дмитрий", "Максим", "Сергей", "Андрей", "Алексей", "Иван", "Евгений",
        "Михаил", "Владимир", "Петр", "Павел", "Артём", "Антон", "Николай", "Роман",
        "Мария", "Анна", "Елена", "Ольга", "Татьяна", "Наталья", "Екатерина", "Ирина"
    };
    
    // Отчества
    private static readonly List<string> _patronymics = new()
    {
        "Александрович", "Дмитриевич", "Сергеевич", "Андреевич", "Алексеевич", "Иванович",
        "Владимирович", "Петрович", "Николаевич", "Павлович", "Романович", "Евгеньевич",
        "Михайлович", "Андреевна", "Дмитриевна", "Сергеевна", "Алексеевна", "Ивановна",
        "Владимировна", "Николаевна"
    };
    
    // Роли в команде
    private static readonly List<string> _roles = new()
    {
        "Тимлид", "Разработчик", "Дизайнер", "DevOps", "Фронтэнд", "Тестировщик", "Аналитик", "Бэкенд"
    };
    
    // Стек технологий
    private static readonly List<string> _stacks = new()
    {
        "C#/.NET", "Java/Spring", "Python/Django", "JavaScript/React", "TypeScript/Angular",
        "Go", "Ruby/Rails", "PHP/Laravel", "Flutter", "Swift/iOS", "Kotlin/Android"
    };
    
    // Группы
    private static readonly List<string> _groups = new()
    {
        "РИ-123000", "РИ-224000", "РИ-125944", "РИ-326000", "РИ-127000", "РИ-128000", "РИ-101932", "РИ-402000",
        "РИ-201000", "РИ-202000", "РИ-301945", "РИ-302000", "РИ-401000", "РИ-402000"
    };
    
    // Проекты
    private static readonly List<ProjectData> _projects = new()
    {
        new ProjectData { Name = "Платформа для онлайн-обучения", Description = "Система для проведения вебинаров и курсов", Semester = "Осень 2024" },
        new ProjectData { Name = "Мобильное приложение доставки", Description = "Приложение для заказа еды с картой и трекингом", Semester = "Осень 2024" },
        new ProjectData { Name = "Аналитическая платформа", Description = "Система сбора и визуализации данных", Semester = "Весна 2025" },
        new ProjectData { Name = "Чат-бот для поддержки клиентов", Description = "AI бот с интеграцией в Telegram", Semester = "Осень 2024" },
        new ProjectData { Name = "CRM система для малого бизнеса", Description = "Управление клиентами и заказами", Semester = "Весна 2025" }
    };
    
    // Дни недели
    private static readonly List<string> _daysOfWeek = new()
    {
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"
    };
    
    // Время встреч
    private static readonly List<string> _meetingTimes = new()
    {
        "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"
    };
    
    // Комментарии
    private static readonly List<string> _comments = new()
    {
        "Отличная работа команды!",
        "Нужно ускорить разработку",
        "Есть вопросы по архитектуре",
        "Всё идёт по плану",
        "Требуется помощь с дизайном",
        "Провели успешное тестирование",
        "Обнаружены критические баги",
        "Деплой прошёл успешно"
    };
    
    // Сообщения для чата
    private static readonly List<string> _messages = new()
    {
        "Привет всем! Как успехи?",
        "Нужен апдейт по задачам",
        "Созвон завтра в 14:00",
        "Запушил новый код в репу",
        "Нашёл багу в авторизации",
        "Починил сборку проекта",
        "Документация обновлена",
        "Когда следующий демо?",
        "Отличная работа, ребята!",
        "Нужна помощь с багой #42",
        "Мержим PR после ревью",
        "Деплоим на тестовый стенд"
    };
    
    // Структуры данных
    private class ProjectData
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Semester { get; set; } = string.Empty;
    }
    
    private class MemberData
    {
        public string name { get; set; } = string.Empty;
        public string group { get; set; } = string.Empty;
        public string role { get; set; } = string.Empty;
        public string stack { get; set; } = string.Empty;
    }
    
    private class TeamData
    {
        public string callDay { get; set; } = string.Empty;
        public string callTime { get; set; } = string.Empty;
        public List<int> curators { get; set; } = new List<int>();
        public List<MemberData> members_l { get; set; } = new List<MemberData>();
        public string name { get; set; } = string.Empty;
        public int projectId { get; set; }
    }
    
    private class ProjectCreateData
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<int> CuratorIds { get; set; } = new List<int>();
        public string StartDate { get; set; } = string.Empty;
        public string EndDate { get; set; } = string.Empty;
        public string Semester { get; set; } = string.Empty;
    }
    
    private class AuthData
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Passwd { get; set; } = string.Empty;
    }
    
    private class LoginData
    {
        public string Email { get; set; } = string.Empty;
        public string Passwd { get; set; } = string.Empty;
    }
    
    private class TaskData
    {
        public string Name { get; set; } = string.Empty;
        public bool Status { get; set; }
        public DateTime Startline { get; set; }
        public DateTime Deadline { get; set; }
    }
    
    /// <summary>
    /// Главный метод запуска скрипта
    /// </summary>
    public static async Task Run(string baseUrl = "http://0.0.0.0:8080")
    {
        _baseUrl = baseUrl;
        _httpClient.BaseAddress = new Uri(_baseUrl);
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "FillerDB/1.0");
        
        Console.WriteLine("Начинаем заполнение базы данных через API");
        Console.WriteLine($"API URL: {_baseUrl}");
        Console.WriteLine(new string('=', 60));
        
        try
        {
            // Проверяем доступность API
            await CheckApiHealth();
            
            // 1. Регистрируем кураторов и получаем токен
            await RegisterAndLoginCurators();
            
            // 2. Создаём проекты
            var projectIds = await CreateProjects();
            
            // 3. Создаём команды для каждого проекта
            var allTeamIds = new List<int>();
            foreach (var projectId in projectIds)
            {
                var teamIds = await CreateTeamsForProject(projectId);
                allTeamIds.AddRange(teamIds);
            }
            
            // 4. Добавляем задачи для команд
            await CreateTasksForTeams(allTeamIds);
            
            // 5. Добавляем сообщения в чаты
            await CreateMessages(allTeamIds);
            
            // 6. Добавляем комментарии к встречам
            await AddCommentsToMeetings();
            
            Console.WriteLine(new string('=', 60));
            Console.WriteLine("БАЗА ДАННЫХ УСПЕШНО ЗАПОЛНЕНА!");
            Console.WriteLine($"Создано проектов: {projectIds.Count}");
            Console.WriteLine($"Создано команд: {allTeamIds.Count}");
            Console.WriteLine($"Создано участников: {allTeamIds.Count * 5}");
            Console.WriteLine($"Кураторов: 3");
            Console.WriteLine(new string('=', 60));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Ошибка: {ex.Message}");
            if (ex.InnerException != null)
                Console.WriteLine($"Детали: {ex.InnerException.Message}");
        }
    }
    
    private static async Task CheckApiHealth()
    {
        Console.WriteLine("Проверка доступности API...");
        var response = await _httpClient.GetAsync("/");
        response.EnsureSuccessStatusCode();
        Console.WriteLine("API доступен\n");
    }
    
    private static async Task RegisterAndLoginCurators()
    {
        Console.WriteLine("Регистрация кураторов...");
        
        var curators = new List<AuthData>
        {
            new AuthData { Name = "Иван Петрович Сидоров", Email = "ivan.sidorov@university.ru", Passwd = "password123" },
            new AuthData { Name = "Мария Ивановна Петрова", Email = "maria.petrova@university.ru", Passwd = "password123" },
            new AuthData { Name = "Сергей Александрович Козлов", Email = "sergey.kozlov@university.ru", Passwd = "password123" }
        };
        
        // Регистрируем кураторов
        foreach (var curator in curators)
        {
            try
            {
                var content = new StringContent(JsonSerializer.Serialize(curator), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync("/auth/register", content);
                if (response.IsSuccessStatusCode)
                    Console.WriteLine($"Зарегистрирован: {curator.Name}");
                else
                    Console.WriteLine($"{curator.Name} уже существует или ошибка регистрации");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Ошибка регистрации {curator.Name}: {ex.Message}");
            }
        }
        
        // Логинимся как первый куратор для создания проектов (где требуется авторизация)
        var loginData = new LoginData { Email = "ivan.sidorov@university.ru", Passwd = "password123" };
        var loginContent = new StringContent(JsonSerializer.Serialize(loginData), Encoding.UTF8, "application/json");
        var loginResponse = await _httpClient.PostAsync("/auth/login", loginContent);
        
        if (loginResponse.IsSuccessStatusCode)
        {
            var responseBody = await loginResponse.Content.ReadAsStringAsync();
            // Предполагаем, что токен приходит в ответе
            var jsonDoc = JsonDocument.Parse(responseBody);
            if (jsonDoc.RootElement.TryGetProperty("token", out var tokenProp))
            {
                _jwtToken = tokenProp.GetString();
                _httpClient.DefaultRequestHeaders.Authorization = 
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _jwtToken);
                Console.WriteLine("Получен JWT токен для создания проектов\n");
            }
        }
    }
    
    private static async Task<List<int>> CreateProjects()
    {
        Console.WriteLine("Создание проектов...");
        var projectIds = new List<int>();
        
        foreach (var project in _projects)
        {
            var startDate = DateTime.Now.AddDays(-_random.Next(1, 30));
            var endDate = startDate.AddDays(_random.Next(60, 120));
            
            var projectData = new ProjectCreateData
            {
                Name = project.Name,
                Description = project.Description,
                CuratorIds = new List<int> { 1, 2 }, // ID кураторов (предполагаем, что они есть)
                StartDate = startDate.ToString("yyyy-MM-dd"),
                EndDate = endDate.ToString("yyyy-MM-dd"),
                Semester = project.Semester
            };
            
            var content = new StringContent(JsonSerializer.Serialize(projectData), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("/project", content);
            
            if (response.IsSuccessStatusCode)
            {
                var responseBody = await response.Content.ReadAsStringAsync();
                // Пытаемся получить ID созданного проекта
                try
                {
                    var jsonDoc = JsonDocument.Parse(responseBody);
                    if (jsonDoc.RootElement.TryGetProperty("id", out var idProp))
                    {
                        var id = idProp.GetInt32();
                        projectIds.Add(id);
                        Console.WriteLine($"Создан проект: {project.Name} (ID: {id})");
                    }
                    else
                    {
                        projectIds.Add(_random.Next(100, 999));
                        Console.WriteLine($"Создан проект: {project.Name}");
                    }
                }
                catch
                {
                    projectIds.Add(_random.Next(100, 999));
                    Console.WriteLine($"Создан проект: {project.Name}");
                }
            }
            else
            {
                Console.WriteLine($"Не удалось создать проект: {project.Name}");
                // Добавляем фейковый ID для продолжения
                projectIds.Add(_random.Next(100, 999));
            }
            
            await Task.Delay(500); // Небольшая задержка между запросами
        }
        
        Console.WriteLine($"Создано проектов: {projectIds.Count}\n");
        return projectIds;
    }
    
    private static async Task<List<int>> CreateTeamsForProject(int projectId)
    {
        Console.WriteLine($"Создание команд для проекта ID: {projectId}");
        var teamIds = new List<int>();
        
        // Для каждого проекта создаём 2-3 команды
        int teamsCount = _random.Next(2, 4);
        
        for (int i = 1; i <= teamsCount; i++)
        {
            var team = new TeamData
            {
                name = $"Команда {((char)('А' + i - 1))} проекта {projectId}",
                projectId = projectId,
                callDay = _daysOfWeek[_random.Next(_daysOfWeek.Count)],
                callTime = _meetingTimes[_random.Next(_meetingTimes.Count)],
                curators = new List<int> { _random.Next(1, 4) }, // ID куратора 1-3
                members_l = new List<MemberData>()
            };
            
            // Добавляем 3-6 участников в команду
            int membersCount = _random.Next(3, 7);
            for (int j = 0; j < membersCount; j++)
            {
                var member = GenerateRandomMember();
                team.members_l.Add(member);
            }
            
            var content = new StringContent(JsonSerializer.Serialize(team), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("/team", content);
            
            if (response.IsSuccessStatusCode)
            {
                teamIds.Add(_random.Next(1000, 9999));
                Console.WriteLine($"Создана команда: {team.name} (участников: {membersCount})");
            }
            else
            {
                Console.WriteLine($"Не удалось создать команду: {team.name}");
            }
            
            await Task.Delay(300);
        }
        
        Console.WriteLine($"Итого команд для проекта {projectId}: {teamIds.Count}");
        return teamIds;
    }
    
    private static async Task CreateTasksForTeams(List<int> teamIds)
    {
        Console.WriteLine("\nСоздание задач для команд...");
        int taskCount = 0;
        
        foreach (var teamId in teamIds)
        {
            // Для каждой команды создаём 5-10 задач
            int tasksForTeam = _random.Next(5, 11);
            
            for (int i = 0; i < tasksForTeam; i++)
            {
                var taskData = new TaskData
                {
                    Name = GenerateRandomTaskName(),
                    Status = _random.Next(0, 2) == 1,
                    Startline = DateTime.Now.AddDays(-_random.Next(1, 15)),
                    Deadline = DateTime.Now.AddDays(_random.Next(1, 30))
                };
                
                var content = new StringContent(JsonSerializer.Serialize(taskData), Encoding.UTF8, "application/json");
                // POST на эндпоинт создания задачи (нужно уточнить ваш эндпоинт)
                try
                {
                    var response = await _httpClient.PostAsync($"/task/{DateTime.Now:yyyy-MM-dd}", content);
                    if (response.IsSuccessStatusCode)
                        taskCount++;
                }
                catch
                {
                    // Игнорируем ошибки при создании задач
                }
            }
        }
        
        Console.WriteLine($"Создано задач: {taskCount}");
    }
    
    private static async Task CreateMessages(List<int> teamIds)
    {
        Console.WriteLine("\nСоздание сообщений в чатах...");
        int messageCount = 0;
        
        foreach (var chatId in teamIds.Take(5)) // Ограничиваем количество чатов
        {
            // В каждый чат добавляем 5-15 сообщений
            int messagesForChat = _random.Next(5, 16);
            
            for (int i = 0; i < messagesForChat; i++)
            {
                var memberId = _random.Next(1, 100);
                var senderName = $"{_surnames[_random.Next(_surnames.Count)]} {_names[_random.Next(_names.Count)]}";
                
                var messageData = new
                {
                    chat_id = chatId,
                    sender_id = memberId,
                    sender_name = senderName,
                    text = _messages[_random.Next(_messages.Count)],
                    CreatedAt = DateTime.Now.AddHours(-_random.Next(1, 720))
                };
                
                var content = new StringContent(JsonSerializer.Serialize(messageData), Encoding.UTF8, "application/json");
                try
                {
                    var response = await _httpClient.PostAsync($"/message/{chatId}", content);
                    if (response.IsSuccessStatusCode)
                        messageCount++;
                }
                catch
                {
                    // Игнорируем ошибки
                }
            }
        }
        
        Console.WriteLine($"Создано сообщений: {messageCount}");
    }
    
    private static async Task AddCommentsToMeetings()
    {
        Console.WriteLine("\nДобавление комментариев к встречам...");
        
        // Получаем список встреч
        try
        {
            var response = await _httpClient.GetAsync("/day/");
            if (response.IsSuccessStatusCode)
            {
                var meetingsJson = await response.Content.ReadAsStringAsync();
                var meetings = JsonSerializer.Deserialize<List<Meeting>>(meetingsJson);
                
                if (meetings != null)
                {
                    int commentCount = 0;
                    foreach (var meeting in meetings.Take(20)) // Комментируем первые 20 встреч
                    {
                        var comment = _comments[_random.Next(_comments.Count)];
                        var content = new StringContent(JsonSerializer.Serialize(new { comment }), 
                            Encoding.UTF8, "application/json");
                            
                        var commentResponse = await _httpClient.PostAsync($"/meeting/comment/{meeting.Id}", content);
                        if (commentResponse.IsSuccessStatusCode)
                            commentCount++;
                    }
                    Console.WriteLine($"Добавлено комментариев: {commentCount}");
                }
            }
        }
        catch
        {
            Console.WriteLine("Не удалось добавить комментарии к встречам");
        }
    }
    
    // Вспомогательные методы для генерации случайных данных
    
    private static MemberData GenerateRandomMember()
    {
        var surname = _surnames[_random.Next(_surnames.Count)];
        var name = _names[_random.Next(_names.Count)];
        var patronymic = _patronymics[_random.Next(_patronymics.Count)];
        
        var fullName = $"{surname} {name} {patronymic}";
        
        return new MemberData
        {
            name = fullName,
            group = _groups[_random.Next(_groups.Count)],
            role = _roles[_random.Next(_roles.Count)],
            stack = _stacks[_random.Next(_stacks.Count)]
        };
    }
    
    private static string GenerateRandomTaskName()
    {
        var taskPrefixes = new[] { "Разработать", "Реализовать", "Настроить", "Оптимизировать", "Протестировать", "Задокументировать" };
        var taskSubjects = new[] { "API эндпоинт", "базу данных", "интерфейс пользователя", "систему авторизации", "отчётность", "миграцию" };
        
        return $"{taskPrefixes[_random.Next(taskPrefixes.Length)]} {taskSubjects[_random.Next(taskSubjects.Length)]}";
    }
    
    // Вспомогательный класс для десериализации встреч
    private class Meeting
    {
        public int Id { get; set; }
        public DateTime Date { get; set; }
        public TimeOnly Time { get; set; }
        public int TeamId { get; set; }
        public short Result { get; set; }
        public List<int> Tasks { get; set; } = new();
        public string Status { get; set; } = string.Empty;
        public List<string> Comments { get; set; } = new();
    }
}