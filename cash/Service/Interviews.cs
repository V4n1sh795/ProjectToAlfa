using Microsoft.EntityFrameworkCore;
using DBContext;
using cash.Models;
namespace Service;

/// <summary>
/// Эндпоинты для телеграм-бота записи команд на собеседование.
/// Контракт описан в tg-bot/app/api/client.py.
/// </summary>
static class Interviews
{
    // Окно собеседований: будни, 10:00-18:00, слоты по 30 минут, ближайшие 14 дней.
    const int HorizonDays = 14;
    static readonly TimeOnly DayStart = new(10, 0);
    static readonly TimeOnly DayEnd = new(18, 0);
    static readonly TimeSpan SlotLength = TimeSpan.FromMinutes(30);
    public const string InterviewStatus = "interview";

    public record BotProject(int id, string name, bool isRecruitmentOpen);
    public record BotDay(string date, List<string> slots);
    public record BotMember(string fullName, string role, string academicGroup, string techStack);
    public record BookRequest
    {
        public int projectId { get; set; }
        public string teamName { get; set; } = string.Empty;
        public long telegramChatId { get; set; }
        public string? telegramUsername { get; set; }
        public DateTime startsAt { get; set; }
        public DateTime endsAt { get; set; }
        public List<BotMember> members { get; set; } = new();
    }

    static bool IsOpen(cash.Models.Project p) => p.IsRecruitmentOpen && !string.Equals(p.status, "archive", StringComparison.OrdinalIgnoreCase);

    public record RecruitmentRequest(bool isRecruitmentOpen);

    public static async Task<IResult> SetRecruitment(AppDbContext db, int id, RecruitmentRequest req)
    {
        var project = await db.Projects.FindAsync(id);
        if (project == null) return Results.NotFound("Project not found");
        project.IsRecruitmentOpen = req.isRecruitmentOpen;
        await db.SaveChangesAsync();
        return Results.Ok(new { id = project.Id, isRecruitmentOpen = project.IsRecruitmentOpen });
    }

    static IEnumerable<(TimeOnly start, TimeOnly end)> DaySlots()
    {
        for (var t = DayStart; t.Add(SlotLength) <= DayEnd; t = t.Add(SlotLength))
            yield return (t, t.Add(SlotLength));
    }

    static string Hm(TimeOnly t) => t.ToString("HH:mm");

    public static async Task<IResult> Projects(AppDbContext db)
    {
        var projects = await db.Projects.OrderBy(p => p.Id).ToListAsync();
        return Results.Ok(projects.Select(p => new BotProject(p.Id, p.Name, IsOpen(p))));
    }

    public static async Task<IResult> AvailableSlots(AppDbContext db, int id)
    {
        var project = await db.Projects.FindAsync(id);
        if (project == null) return Results.NotFound("Project not found");
        if (!IsOpen(project)) return Results.Ok(new { dates = new List<BotDay>() });

        var today = DateTime.UtcNow.Date;
        var from = DateTime.SpecifyKind(today, DateTimeKind.Utc);
        var to = from.AddDays(HorizonDays + 1);
        var busy = (await db.Meetings
                .Where(m => m.Date >= from && m.Date < to)
                .Select(m => new { m.Date, m.Time })
                .ToListAsync())
            .Select(m => (m.Date.Date, m.Time))
            .ToHashSet();

        var now = TimeOnly.FromDateTime(DateTime.Now);
        var dates = new List<BotDay>();
        for (int i = 0; i <= HorizonDays; i++)
        {
            var day = today.AddDays(i);
            if (day.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) continue;
            var slots = DaySlots()
                .Where(s => !busy.Contains((day, s.start)) && (i > 0 || s.start > now))
                .Select(s => $"{Hm(s.start)}-{Hm(s.end)}")
                .ToList();
            if (slots.Count > 0) dates.Add(new BotDay(day.ToString("yyyy-MM-dd"), slots));
        }
        return Results.Ok(new { dates });
    }

    public static async Task<IResult> Book(AppDbContext db, IConfiguration config, BookRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.teamName) || req.members.Count == 0)
            return Results.BadRequest("teamName and members are required");
        var project = await db.Projects.FindAsync(req.projectId);
        if (project == null) return Results.NotFound("Project not found");
        if (!IsOpen(project)) return Results.BadRequest("Recruitment is closed");

        var day = req.startsAt.Date;
        var start = TimeOnly.FromDateTime(req.startsAt);
        var end = TimeOnly.FromDateTime(req.endsAt);
        if (!DaySlots().Any(s => s.start == start && s.end == end)
            || day.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday
            || req.startsAt < DateTime.Now)
            return Results.BadRequest("Invalid slot");

        var dayUtc = DateTime.SpecifyKind(day, DateTimeKind.Utc);
        var taken = await db.Meetings.AnyAsync(m => m.Date == dayUtc && m.Time == start);
        if (taken) return Results.Conflict("Slot is already taken");

        var team = new cash.Models.Team
        {
            Name = req.teamName.Trim(),
            ProjectId = project.Id,
            CallDay = day.DayOfWeek.ToString(),
            CallTime = Hm(start),
            Comments = new List<string> { $"Telegram: {req.telegramUsername ?? "-"} (chat {req.telegramChatId})" }
        };
        foreach (var m in req.members)
        {
            var parts = m.fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var member = new cash.Models.Member(
                parts.Length > 1 ? parts[1] : "",
                parts.Length > 0 ? parts[0] : "",
                parts.Length > 2 ? string.Join(' ', parts.Skip(2)) : "");
            member.Profiles.Add(new cash.Models.Profile
            {
                Role = m.role,
                Stack = m.techStack,
                GroupNumber = m.academicGroup,
                ProjectId = project.Id
            });
            team.Members.Add(member);
        }
        db.Teams.Add(team);
        await db.SaveChangesAsync();

        var meeting = new cash.Models.Meeting(dayUtc, start, team.Id) { Status = InterviewStatus };
        db.Meetings.Add(meeting);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Встреча не сохранилась — убираем уже созданную команду, чтобы не оставлять сирот.
            db.Remove(meeting);
            db.Teams.Remove(team);
            await db.SaveChangesAsync();
            return Results.Conflict("Slot is already taken");
        }

        var baseLink = config["Interviews:MeetingLinkBase"] ?? "https://talk.kontur.ru/";
        return Results.Created($"/team/{team.Id}", new
        {
            projectName = project.Name,
            startsAt = req.startsAt.ToString("s"),
            meetingLink = baseLink.TrimEnd('/') + "/" + Guid.NewGuid().ToString("N")[..12]
        });
    }
}
