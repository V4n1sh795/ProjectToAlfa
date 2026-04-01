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
        await db.Teams.AddAsync(Team);
        await db.SaveChangesAsync();
        return Results.Ok();
    }
    public static async Task<IResult> GTeam(AppDbContext db, int id)
    {
        var team = await db.Teams.FindAsync(id);
        if (team is null)
            return Results.NotFound($"Member with ID {id} not found");
        
        return Results.Ok(team);
    }
}