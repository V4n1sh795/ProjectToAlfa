using Microsoft.EntityFrameworkCore;
using cash.Models;
using DBContext;
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
}