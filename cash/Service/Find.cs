using Microsoft.EntityFrameworkCore;
using cash.Models;
using DBContext;
using System.Text.Json.Serialization;
namespace Service;
using System.Globalization;
static class Find
{
    public record TeamDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
    }
    public record ICurator
    {
        public string email {get; set; } 
        public string id {get; set; }
        public string name {get; set; }
        public List<TeamDto> teams {get; set; } = new List<TeamDto>();
    }


    public record ProjectDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("artifacts")]
        public string Artifacts { get; set; } = string.Empty;
    }

    // Модель участника
    public record MemberDto
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("role")]
        public string Role { get; set; } = string.Empty;
    }

    // Модель оценок
    public record GradesDto
    {
        [JsonPropertyName("checkpoint1")]
        public string Checkpoint1 { get; set; } = string.Empty;

        [JsonPropertyName("checkpoint2")]
        public string Checkpoint2 { get; set; } = string.Empty;

        [JsonPropertyName("checkpoint3")]
        public string Checkpoint3 { get; set; } = string.Empty;

        [JsonPropertyName("final")]
        public string Final { get; set; } = string.Empty;
    }
    public record CuratorDto
    {
        [JsonPropertyName("id")]
        public int id { get; set; } 
        [JsonPropertyName("name")]
        public string name{ get; set; } = string.Empty; 
    }
    // Корневая модель
    public class ITeam
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("project")]
        public ProjectDto Project { get; set; } = new();

        [JsonPropertyName("callDay")]
        public string CallDay { get; set; } = string.Empty;

        [JsonPropertyName("callTime")]
        public string CallTime { get; set; } = string.Empty;

        [JsonPropertyName("members")]
        public List<MemberDto> Members { get; set; } = new();

        [JsonPropertyName("curators")]
        public List<CuratorDto> Curators { get; set; } = new List<CuratorDto>(); // или замените на конкретный тип

        [JsonPropertyName("grades")]
        public GradesDto Grades { get; set; } = new();

        [JsonPropertyName("comment")]
        public string Comment { get; set; } = string.Empty;
    }

    public static async Task<IResult> FindEntity(ILogger<Program> logger, AppDbContext db, string entity, string? query)
    {
        logger.LogDebug($"query is - {query}");
        return entity.ToLower() switch
        {
            "project" or "projects" => await FindProjects(db, query),
            "team" or "teams" => await FindTeams(db, query),
            "member" or "members" or "student" or "students" => await FindMembers(db, query),
            "curator" or "curators" => await FindCurators(db, query),
            _ => Results.BadRequest($"Unknown entity: {entity}. Available entities: project, team, member, curator")
        };
    }

    private static async Task<IResult> FindProjects(AppDbContext db, string? query)
    {
        IQueryable<cash.Models.Project> queryset = db.Projects;

        if (!string.IsNullOrEmpty(query))
        {
            queryset = queryset.Where(p =>
                p.Name.Contains(query) ||
                p.Description.Contains(query) ||
                p.Semester.Contains(query));
        }

        var results = await queryset.ToListAsync();
        return Results.Ok(results);
    }

    private static async Task<IResult> FindTeams(AppDbContext db, string? query)
    {
        IQueryable<cash.Models.Team> queryset = db.Teams;

        if (!string.IsNullOrEmpty(query))
        {
            queryset = queryset.Where(t => t.Name.Contains(query));
        }

        var results = await queryset.ToListAsync();
        return Results.Ok(results);
    }

    private static async Task<IResult> FindMembers(AppDbContext db, string? query)
    {
        IQueryable<Member> queryset = db.Members;

        if (!string.IsNullOrEmpty(query))
        {
            queryset = queryset.Where(m =>
                m.Name.Contains(query) ||
                m.Surname.Contains(query) ||
                m.SecondName.Contains(query));
        }

        var results = await queryset.ToListAsync();
        return Results.Ok(results);
    }

    private static async Task<IResult> FindCurators(AppDbContext db, string? query)
    {
        IQueryable<cash.Models.Curator> queryset = db.Curators;

        if (!string.IsNullOrEmpty(query))
        {
            queryset = queryset.Where(c =>
                c.Name.Contains(query) ||
                c.Email.Contains(query));
        }

        var results = await queryset.ToListAsync();
        return Results.Ok(results);
 
    }
    public static async System.Threading.Tasks.Task ShiftMeetings(AppDbContext db,DayOfWeek newDayOfWeek, TimeOnly newTime, int TeamId)
    {
        var meetings = await db.Meetings.Where(m => m.TeamId == TeamId).ToListAsync();

        foreach (var meeting in meetings)
        {
            int daysDiff = newDayOfWeek - meeting.Date.DayOfWeek;
            
            if (daysDiff < 0)
            {
                daysDiff += 7;
            }

            meeting.Date = meeting.Date.AddDays(daysDiff);
            meeting.Time = newTime;
        }

        await db.SaveChangesAsync();
    }
    public static async Task<IResult> PatchTeam(AppDbContext db, int id, ITeam team)
    {
        cash.Models.Team Team = db.Teams.Where(t => t.Id == id)
                                        .Include(t => t.Members)
                                        .ToList()[0];
        if (Team != null)
        {
            Team.Curators.Clear();
            Team.CallDay = team.CallDay;
            Team.CallTime = team.CallTime;
            DayOfWeek dayOfWeek = ParseDayOfWeek(team.CallDay);
            await ShiftMeetings(db, dayOfWeek, TimeOnly.Parse(team.CallTime), Team.Id);
            Team.Comments.Add(team.Comment);
            Team.artifacts = team.Project.Artifacts;
            foreach (CuratorDto curator in team.Curators)
            {
                Team.Curators.Add(curator.id);
            }

            var membersResult = await UpdateTeamMembersAsync(db, Team, team.Members, team.Project.Id);
            if (membersResult != null)
                return membersResult;

            Team.ProjectId = team.Project.Id;
            await db.SaveChangesAsync();
            return Results.Ok(team);
        }
        else
            return Results.BadRequest("Team with id not found");
    }
    private static async Task<IResult?> UpdateTeamMembersAsync(
                                                            AppDbContext db,
                                                            cash.Models.Team team,
                                                            IEnumerable<MemberDto> membersDto,
                                                            int projectId)
    {
        foreach (MemberDto member in membersDto)
        {
            if (member.Id != null)
            {
                // Patch существующего участника
                var existingMember = db.Members
                    .Where(m => m.Id == member.Id)
                    .Include(m => m.Profiles)
                    .ToList()
                    .FirstOrDefault();

                if (existingMember == null)
                    return Results.BadRequest("Member with this id not found");

                var fio = member.Name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                existingMember.Surname = fio.Length > 0 ? fio[0] : "";
                existingMember.Name = fio.Length > 1 ? fio[1] : "";
                existingMember.SecondName = fio.Length > 2 ? fio[2] : "";

                var profile = existingMember.Profiles
                    .FirstOrDefault(p => p.ProjectId == team.ProjectId);

                if (profile == null)
                    return Results.BadRequest($"Profile not found for member {member.Id} in project {team.ProjectId}");

                profile.Role = member.Role;
                await db.SaveChangesAsync();
            }
            else
            {
                // Добавление нового участника
                var fio = member.Name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                var newMember = new cash.Models.Member
                {
                    Surname = fio.Length > 0 ? fio[0] : "",
                    Name = fio.Length > 1 ? fio[1] : "",
                    SecondName = fio.Length > 2 ? fio[2] : "",
                    Profiles = new List<cash.Models.Profile>
                    {
                        new cash.Models.Profile
                        {
                            Role = member.Role,
                            Stack = "?",
                            ProjectId = projectId,
                            GroupNumber = "?"
                        }
                    }
                };

                team.Members.Add(newMember);
                db.Members.Add(newMember);
                await db.SaveChangesAsync();
            }
        }

        return null;
    }
    public static DayOfWeek ParseDayOfWeek(string Day)
    {
        var days = new Dictionary<string, DayOfWeek>(StringComparer.OrdinalIgnoreCase)
        {
            ["monday"] = DayOfWeek.Monday,
            ["tuesday"] = DayOfWeek.Tuesday,
            ["wednesday"] = DayOfWeek.Wednesday,
            ["thursday"] = DayOfWeek.Thursday,
            ["friday"] = DayOfWeek.Friday,
            ["saturday"] = DayOfWeek.Saturday,
            ["sunday"] = DayOfWeek.Sunday
        };
        
        return days.TryGetValue(Day, out var result) 
            ? result 
            : throw new ArgumentException($"Unknown day: {Day}");
    }
    public static async Task<IResult> PatchMember(AppDbContext db, int id, List<(string param, string new_value)> values)
    {
        cash.Models.Member? member = await db.Members.FindAsync(id);
        if (member == null)
            return Results.NotFound("endpoint not ready");
        else
        {
            return Results.NotFound("endpoint not ready");
        }
    }
    public static async Task<IResult> PatchCurator(AppDbContext db, int id, ICurator curator)
    {
        cash.Models.Curator c = await db.Curators.FindAsync(id);
        if (c == null)
            return Results.NotFound("Curator not found");
        else
        {
            c.Name = curator.name;
            c.Email = curator.email;
            List<int> new_teams_id = curator.teams.Select(t => t.Id).ToList();
            List<cash.Models.Team> new_teams_list = db.Teams.Where(t => new_teams_id.Contains(t.Id)).ToList();
            List<cash.Models.Team> teams_from_db_by_curator = db.Teams.Where(t => t.Curators.Contains(id)).ToList();
            foreach (var team in teams_from_db_by_curator)
            {
                team.Curators.Remove(id);
            }
            foreach (var team in new_teams_list)
            {
                team.Curators.Add(id);
            }
            await db.SaveChangesAsync();
            return Results.Ok();
        }
    }

    internal static async System.Threading.Tasks.Task PatchProject(HttpContext context)
    {
        throw new NotImplementedException();
    }
}