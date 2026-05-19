using Microsoft.EntityFrameworkCore;
using cash.Models;
using DBContext;
using StackExchange.Redis;
namespace Service;

static class Project
{
    public record IProject
    {
        public string name {get; set;} = string.Empty;
        public string description {get; set;} = string.Empty;
        public string Main_Goal { get; init; } = string.Empty;
        public string Results { get; init; } = string.Empty;
        public string Roles { get; init; } = string.Empty;
        public string Technology { get; init; } = string.Empty;
        public string endDate {get; set;} = string.Empty;
        public string startDate {get; set;} = string.Empty;
        public List<string> curators {get; set;} = new List<string>();
        public string semester {get; set;} = string.Empty;
        
    }
    public record OProject
    {
        public int Id { get; init; }
        public string Name { get; init; } = string.Empty;
        public string Description { get; init; } = string.Empty;
        public string Main_Goal { get; init; } = string.Empty;
        public string Results { get; init; } = string.Empty;
        public string Roles { get; init; } = string.Empty;
        public string Technology { get; init; } = string.Empty;
        public List<KeyValuePair<int, string>> Curators { get; init; } = new List<KeyValuePair<int, string>>();
        public List<KeyValuePair<int, string>> Teams { get; init; } = new List<KeyValuePair<int, string>>();
        public string StartDate { get; init; } = string.Empty;
        public string EndDate { get; init; } = string.Empty;
        public string Semester { get; init; } = string.Empty;
    }
    public static async Task<IResult> Create(AppDbContext db, IProject p)
    {
        cash.Models.Project project = new cash.Models.Project
        {
            CuratorIds = p.curators.Select(int.Parse).ToList(),
            Name = p.name,
            Description = p.description,
            Main_Goal = p.Main_Goal,
            Results = p.Results,
            Roles = p.Roles,
            Technology = p.Technology,
            StartDate = p.startDate,
            EndDate = p.endDate,
            Semester = p.semester
        };
        await db.Projects.AddAsync(project);
        await db.SaveChangesAsync();
        return Results.Ok(project);
    }
    public static async Task<IResult> GProject(AppDbContext db, int id)
    {
        cash.Models.Project project = await db.Projects.FindAsync(id);
        if (project != null)
        {
            List<KeyValuePair<int, string>> CuratorsL = new List<KeyValuePair<int, string>>();
            List<KeyValuePair<int, string>> TeamsL = new List<KeyValuePair<int, string>>();

            foreach (int Cid in project.CuratorIds)
            {
                cash.Models.Curator c = await db.Curators.FirstOrDefaultAsync(c => c.Id == Cid);
                CuratorsL.Add(new KeyValuePair<int, string> (Cid, c.Name));
            }

            List<cash.Models.Team> teams = await db.Teams.Where(t => t.ProjectId == project.Id).ToListAsync();
            foreach(var team in teams)
            {
                TeamsL.Add(new KeyValuePair<int, string> (team.Id, team.Name));
            }

            OProject response = new OProject
            {
                Name = project.Name,
                Description = project.Description,
                Main_Goal = project.Main_Goal,
                Results = project.Results,
                Roles = project.Roles,
                Technology = project.Technology,
                Curators = CuratorsL,
                Teams = TeamsL,
                StartDate = project.StartDate,
                EndDate = project.EndDate,
                Semester = project.Semester
            };
            return Results.Ok(response);
        }
        else
            return Results.BadRequest("Project with this id doesnt exist");
    }
}