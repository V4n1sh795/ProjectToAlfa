using Microsoft.EntityFrameworkCore;
using cash.Models;
using DBContext;

namespace Service;

static class Find
{
    record OProject
    {
        string Name { get; set; } = string.Empty;
        string Description { get; set; } = string.Empty;
        List<string> CuratorsName { get; set; } = new List<string>();
        public List<int> CuratorIds { get; init; } = new List<int>();
        public string StartDate { get; init; } = string.Empty;
        public string EndDate { get; init; } = string.Empty;
        public string Semester { get; init; } = string.Empty;
    }
    record OTeam 
    {
        public string Name { get; set; } = string.Empty;
        public List<string> Comments { get; set; } = new List<string>();
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public List<string> Membres = 
        List<KeyValuePair<int, string>> curators = new List<KeyValuePair<int, string>>();
        public string CallDay { get; set; } = string.Empty;
        public string CallTime { get; set; } = string.Empty;
    }
    record OMember 
    {
        
    }
    record OCurator
    {
        
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

    public static async Task<IResult> ShowInfo(AppDbContext db, string entity, int id)
    {
        switch (entity)
        {
            case "project":
                return Results.Ok(SIProject(db, id));
            
            case "team":
                return Results.Ok(SITeam(db, id));
            
            case "curator":
                return Results.Ok(SIMember(db, id));
            
            case "member":
                return Results.Ok(SICurator(db, id));
            
            default:
                return Results.BadRequest($"Invalid entity type: {entity}");
        }
    }
    private static async OProject SIProject(AppDbContext db, int id)
    {
        return 
    }
    private static async OTeam SITeam(AppDbContext db, int id)
    {
        return 
    }
    private static async OMember SIMember(AppDbContext db, int id)
    {
        return 
    }
    private static async OCurator SICurator(AppDbContext db, int id)
    {
        return 
    }
}