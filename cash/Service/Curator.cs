using Microsoft.EntityFrameworkCore;
using cash.Models;
using DBContext;
using Microsoft.AspNetCore.Mvc;
namespace Service;

static class Curator
{
    record OCurator
    {
        public int Id { get; set; }
        public string Name {get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public List<KeyValuePair<int, string>> Projects { get; set; } = new List<KeyValuePair<int, string>>();
        public List<KeyValuePair<int, string>> Teams { get; set; } = new List<KeyValuePair<int, string>>();

    }
    public static async Task<IResult> GCurator(AppDbContext db, int id)
    {
        var curator = await db.Curators.FindAsync(id);
        if (curator is null)
            return Results.NotFound($"Member with ID {id} not found");

        List<KeyValuePair<int, string>> CProjects  = new List<KeyValuePair<int, string>>();
        List<KeyValuePair<int, string>> CTeams = new List<KeyValuePair<int, string>>();

        foreach (var team in await db.Teams.Where(t => t.Curators.Contains(curator.Id)).ToListAsync())
        {
            KeyValuePair<int, string> toadd = new KeyValuePair<int, string>(team.Id, team.Name);
            CTeams.Add(toadd);
        }
        foreach (var project in await db.Projects.Where(p => p.CuratorIds.Contains(curator.Id)).ToListAsync())
        {
            KeyValuePair<int, string> toadd = new KeyValuePair<int, string>(project.Id, project.Name);
            CProjects.Add(toadd);
        }
        var response = new OCurator
        {
            Id = curator.Id,
            Name = curator.Name,
            Email = curator.Email,
            Projects = CProjects,
            Teams = CTeams
        };
        return Results.Ok(response);
    }
    public static async Task<IResult> GCurators(AppDbContext db)
    {
        var data = await db.Curators
            .Where(c => c.Name != null && c.Name != "")
            .Select(c => new { c.Id, c.Name })
            .ToListAsync();
        
        return Results.Ok(data);
    }
    public static async Task<IResult> Stat(
        AppDbContext db, 
        int curatorId, 
        [FromQuery] DateOnly startDate,
        [FromQuery] DateOnly endDate)
    {
        // 1. Конвертируем в UTC DateTime
        var startDateTime = startDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var endDateTime = endDate.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        // 2. Получаем встречи за период (фильтрация на стороне БД)
        var meetings = await db.Meetings
            .Where(m => m.Date > startDateTime && m.Date < endDateTime)
            .ToListAsync(); // async, не ToArray()

        // 3. Считаем посещенные встречи (фильтрация в памяти, т.к. данные уже загружены)
        int visitedMeetings = meetings.Count(m => m.WasCurators.Contains(curatorId));

        // 4. Считаем количество встреч, где куратор участвовал (исправленная логика)
        int meetingsCount = meetings.Count; // или другая логика, в зависимости от требований

        // 5. Получаем куратора
        var curator = await db.Curators
            .Where(c => c.Id == curatorId)
            .FirstOrDefaultAsync();

        if (curator == null)
        {
            return Results.NotFound($"Curator with id {curatorId} not found");
        }

        return Results.Ok(new
        {
            curatorName = curator.Name,
            meetingsCount = meetingsCount,
            visitedMeetings = visitedMeetings
        });
    }
}