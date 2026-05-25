using Microsoft.EntityFrameworkCore;
using cash.Models;
using DBContext;
using Microsoft.VisualBasic;
using Microsoft.AspNetCore.Mvc;

namespace Service;

static class Find
{

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
    public static async Task<IResult> PatchEntity(ILogger<Program> logger, AppDbContext db, string entity, int id, List<(string param, string new_value)> values)
    {
        return entity.ToLower() switch
            {
                "project" or "projects" => await PatchProject(db, id, values),
                "team" or "teamss" => await PatchTeam(db, id, values),
                "member" or "members" => await PatchMember(db, id, values),
                "curator" or "curators" => await PatchCurator(db, id, values)
            };
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
    private static async Task<IResult> PatchCurator(AppDbContext db, int id, List<(string param, string new_value)> values)
    {
        return Results.NotFound("endpoint not ready");
    }
}