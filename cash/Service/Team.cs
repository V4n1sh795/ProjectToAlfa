using Microsoft.EntityFrameworkCore;
using cash.Models;
using DBContext;
namespace Service;
static class Team
{
    public record IMember
    {
        public string name {get; set; }= string.Empty; //FIO
        public string group {get; set; } = string.Empty;
        public string role {get; set; } = string.Empty;
        public string stack {get; set; } = string.Empty;
    }
    public record ITeam
    {
        public string callDay { get; set; } = string.Empty;
        public string callTime { get; set; } = string.Empty;
        public List<int> curators { get; set; } = new List<int>();
        public List<IMember> members_l { get; set; } = new List<IMember>();
        public string name { get; set; } = string.Empty;
        public int projectId { get; set; }
    }
    public static async Task<IResult> CreateTeam(AppDbContext db, ITeam team)
    {
        Dictionary<string, string> RuToEn = new()
        {
            { "Понедельник", "Monday" },
            { "Вторник", "Tuesday" },
            { "Среда", "Wednesday" },
            { "Четверг", "Thursday" },
            { "Пятница", "Friday" },
            { "Суббота", "Saturday" },
            { "Воскресенье", "Sunday" }
        };
        List<Member> members = new List<Member>();
        foreach (var m in team.members_l)
        {
            string[] l = m.name.Split(" ");
            var existingMember = await db.Members
                .FirstOrDefaultAsync(m => m.Name == l[1] && 
                                        m.Surname == l[0] && 
                                        m.SecondName == l[2]);

            if (existingMember != null)
            {
                existingMember.Profiles.Add(new Profile
                {
                    Role = m.role,
                    Stack = m.stack,
                    GroupNumber = m.group
                });
                await db.SaveChangesAsync();
            }
            else
            {
                Profile profile = new Profile
                    {
                        Role = m.role,
                        Stack = m.stack,
                        GroupNumber = m.group
                    };
                Member member = new Member(l[1], l[0], l[2]);
                member.Profiles.Add(profile);
                members.Add(member);
                await db.Members.AddAsync(member);
                await db.SaveChangesAsync();
            }
        }

        cash.Models.Team Team = new cash.Models.Team
        {
            Name = team.name,
            ProjectId = team.projectId,
            Members = members,
            Curators = team.curators,
            CallDay = RuToEn[team.callDay],
            CallTime = team.callTime
        };
        var project = db.Projects.Find(team.projectId);

        await db.Teams.AddAsync(Team);
        await db.SaveChangesAsync();

        await GenerateMeetings(RuToEn[team.callDay], team.callTime, Team.Id, project.StartDate, project.EndDate, db);

        return Results.Ok();
    }
    static async System.Threading.Tasks.Task GenerateMeetings(
                                string dayName, 
                                string timeS, 
                                int teamId, 
                                string startDay, 
                                string endDay,
                                AppDbContext db
                                    )
    {
        DateTime sDay = DateTime.Parse(startDay).ToUniversalTime();
        DateTime eDay = DateTime.Parse(endDay).ToUniversalTime();
        
        if (!Enum.TryParse(dayName, true, out DayOfWeek day))
            throw new ArgumentException($"Invalid day name: {dayName}");
        
        if (!TimeOnly.TryParse(timeS, out TimeOnly time))
            throw new ArgumentException($"Invalid time format: {timeS}");
        
        // Находим первый нужный день
        int daysUntilTarget = ((int)day - (int)sDay.DayOfWeek + 7) % 7;
        DateTime current = sDay.AddDays(daysUntilTarget);
        
        // Создаем список дат
        var dates = new List<DateTime>();
        while (current <= eDay)
        {
            dates.Add(current);
            current = current.AddDays(7);
        }
        
        // Проверяем существующие встречи
        var existingDates = await db.Meetings
            .Where(m => m.TeamId == teamId && dates.Contains(m.Date))
            .Select(m => m.Date)
            .ToListAsync();
        
        // Фильтруем только новые даты
        var newDates = dates.Except(existingDates).ToList();
        
        if (newDates.Any())
        {
            var meetings = newDates.Select(date => new cash.Models.Meeting(date, time, teamId));
            await db.Meetings.AddRangeAsync(meetings);
            await db.SaveChangesAsync();
            Console.WriteLine($"Added {newDates.Count} meetings");
        }
        else
        {
            Console.WriteLine("No new meetings to add");
        }
    }
    public static async Task<IResult> GTeam(AppDbContext db, int id)
    {
        var team = await db.Teams.FindAsync(id);
        if (team is null)
            return Results.NotFound($"Member with ID {id} not found");
        
        return Results.Ok(team);
    }
}