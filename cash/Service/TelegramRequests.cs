using Microsoft.EntityFrameworkCore;
using DBContext;
using cash.Models;
namespace Service;

/// <summary>
/// Заявки команд, записавшихся через телеграм-бота (Team.RequestStatus != null).
/// Идентификатор заявки совпадает с идентификатором команды.
/// Формат ответа совпадает с тем, что ждёт страница «Управление Telegram-ботом».
/// </summary>
static class TelegramRequests
{
    public const string Pending = "pending", Accepted = "accepted", Declined = "declined", Scheduled = "scheduled";

    public record DraftMember(string name, string group, string role, string stack, string? contact);
    public record TeamDraft
    {
        public string name { get; set; } = string.Empty;
        public int? projectId { get; set; }
        public string callDay { get; set; } = string.Empty;
        public string callTime { get; set; } = string.Empty;
        public List<DraftMember>? members { get; set; }
    }
    public record DeclineDto(string reason);

    static readonly Dictionary<string, string> RuToEn = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Понедельник"] = "Monday", ["Вторник"] = "Tuesday", ["Среда"] = "Wednesday",
        ["Четверг"] = "Thursday", ["Пятница"] = "Friday", ["Суббота"] = "Saturday", ["Воскресенье"] = "Sunday"
    };

    static string? NormalizeDay(string day)
    {
        day = day.Trim();
        if (RuToEn.TryGetValue(day, out var en)) return en;
        return Enum.TryParse<DayOfWeek>(day, true, out var d) ? d.ToString() : null;
    }

    static string FullName(cash.Models.Member m) => string.Join(' ', new[] { m.Surname, m.Name, m.SecondName }.Where(x => !string.IsNullOrWhiteSpace(x)));

    static async Task<cash.Models.Team?> Find(AppDbContext db, int id) =>
        await db.Teams.Include(t => t.Members).ThenInclude(m => m.Profiles)
            .FirstOrDefaultAsync(t => t.Id == id && t.RequestStatus != null);

    static object View(cash.Models.Team t)
    {
        var members = t.Members.OrderBy(m => m.Id).Select(m =>
        {
            var p = m.Profiles.LastOrDefault(x => x.ProjectId == t.ProjectId) ?? m.Profiles.LastOrDefault();
            return new
            {
                id = m.Id,
                name = FullName(m),
                group = p?.GroupNumber ?? "",
                role = p?.Role ?? "",
                stack = p?.Stack ?? "",
                contact = m.conntacts,
                exists = true
            };
        }).ToList();
        return new
        {
            id = t.Id,
            projectId = t.ProjectId,
            status = t.RequestStatus,
            date = t.RequestDate?.ToString("yyyy-MM-dd"),
            reason = t.DeclineReason,
            team = new
            {
                name = t.Name,
                projectId = t.ProjectId,
                callDay = t.CallDay,
                callTime = t.CallTime,
                members,
                artifacts = members.FirstOrDefault()?.contact ?? ""
            }
        };
    }

    public static async Task<IResult> List(AppDbContext db)
    {
        var teams = await db.Teams.Include(t => t.Members).ThenInclude(m => m.Profiles)
            .Where(t => t.RequestStatus != null)
            .OrderByDescending(t => t.RequestDate).ThenBy(t => t.Id)
            .ToListAsync();
        return Results.Ok(teams.Select(View));
    }

    public static async Task<IResult> Accept(AppDbContext db, int id)
    {
        var team = await Find(db, id);
        if (team == null) return Results.NotFound("Request not found");
        if (team.RequestStatus != Pending) return Results.Conflict("Request is not pending");
        team.RequestStatus = Accepted;
        await db.SaveChangesAsync();
        return Results.Ok(View(team));
    }

    public static async Task<IResult> Decline(AppDbContext db, int id, DeclineDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.reason)) return Results.BadRequest("reason is required");
        var team = await Find(db, id);
        if (team == null) return Results.NotFound("Request not found");
        if (team.RequestStatus != Pending) return Results.Conflict("Request is not pending");
        team.RequestStatus = Declined;
        team.DeclineReason = dto.reason.Trim();
        // Освобождаем слот собеседования.
        db.Meetings.RemoveRange(await db.Meetings.Where(m => m.TeamId == id && m.Status == Interviews.InterviewStatus).ToListAsync());
        await db.SaveChangesAsync();
        return Results.Ok(View(team));
    }

    static async Task<string?> ApplyDraft(AppDbContext db, cash.Models.Team team, TeamDraft draft, bool requireSchedule)
    {
        var hasSchedule = !string.IsNullOrWhiteSpace(draft.callDay) || !string.IsNullOrWhiteSpace(draft.callTime);
        string? day = null;
        if (requireSchedule || hasSchedule)
        {
            day = NormalizeDay(draft.callDay ?? "");
            if (day == null) return "Invalid callDay";
            if (!TimeOnly.TryParse(draft.callTime, out var time)) return "Invalid callTime";
            draft.callTime = time.ToString("HH:mm");
            var busy = await db.Teams.AnyAsync(t => t.Id != team.Id && t.CallDay == day && t.CallTime == draft.callTime);
            if (busy) return "conflict";
        }
        if (string.IsNullOrWhiteSpace(draft.name)) return "name is required";
        if (draft.projectId != null)
        {
            if (await db.Projects.FindAsync(draft.projectId) == null) return "Project not found";
            team.ProjectId = draft.projectId.Value;
        }
        team.Name = draft.name.Trim();
        if (day != null) { team.CallDay = day; team.CallTime = draft.callTime; }

        if (draft.members is { Count: > 0 })
        {
            db.Members.RemoveRange(team.Members.ToList());
            team.Members.Clear();
            foreach (var m in draft.members)
            {
                var parts = m.name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                var member = new cash.Models.Member(
                    parts.Length > 1 ? parts[1] : "",
                    parts.Length > 0 ? parts[0] : "",
                    parts.Length > 2 ? string.Join(' ', parts.Skip(2)) : "")
                { conntacts = m.contact ?? "" };
                member.Profiles.Add(new cash.Models.Profile
                {
                    Role = m.role, Stack = m.stack, GroupNumber = m.group, ProjectId = team.ProjectId
                });
                team.Members.Add(member);
            }
        }
        return null;
    }

    static IResult Fail(string error) => error == "conflict"
        ? Results.Conflict("Такая дата и время уже заняты")
        : error == "Project not found" ? Results.NotFound(error) : Results.BadRequest(error);

    public static async Task<IResult> Schedule(AppDbContext db, int id, TeamDraft draft)
    {
        var team = await Find(db, id);
        if (team == null) return Results.NotFound("Request not found");
        if (team.RequestStatus != Accepted) return Results.Conflict("Request is not accepted");
        var error = await ApplyDraft(db, team, draft, requireSchedule: true);
        if (error != null) return Fail(error);
        team.RequestStatus = Scheduled;
        await db.SaveChangesAsync();

        var project = await db.Projects.FindAsync(team.ProjectId);
        if (project != null)
            await Team.GenerateMeetings(team.CallDay, team.CallTime, team.Id, project.StartDate, project.EndDate, db);
        return Results.Ok(View(team));
    }

    public static async Task<IResult> Update(AppDbContext db, int id, TeamDraft draft)
    {
        var team = await Find(db, id);
        if (team == null) return Results.NotFound("Request not found");
        if (team.RequestStatus == Declined) return Results.Conflict("Request is declined");
        var error = await ApplyDraft(db, team, draft, requireSchedule: team.RequestStatus == Scheduled);
        if (error != null) return Fail(error);
        await db.SaveChangesAsync();
        return Results.Ok(View(team));
    }
}
