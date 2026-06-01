using Microsoft.EntityFrameworkCore;
using cash.Models;
using DBContext;
using Microsoft.VisualBasic;
using Microsoft.AspNetCore.Mvc;

namespace Service;

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
    private static async Task<IResult> PatchProject(AppDbContext db, int id, List<(string param, string new_value)> values)
    {
        return Results.NotFound("endpoint not ready");
    }
    private static async Task<IResult> PatchTeam(AppDbContext db, int id, List<(string param, string new_value)> values)
    {
        return Results.NotFound("endpoint not ready");
    }
    private static async Task<IResult> PatchMember(AppDbContext db, int id, List<(string param, string new_value)> values)
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
}