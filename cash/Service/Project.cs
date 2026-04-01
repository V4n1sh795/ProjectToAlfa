using Microsoft.EntityFrameworkCore;
using cash.Models;
using DBContext;
namespace Service;

static class Project
{
    public record IProject
    {
        public string name {get; set;}
        public string description {get; set;}
        public string endDate {get; set;}
        public string startDate {get; set;}
        public List<string> curators {get; set;}
        public string semester {get; set;}
        
    }
    public static async Task<IResult> Create(AppDbContext db, IProject p)
    {
        cash.Models.Project project = new cash.Models.Project
        {
            CuratorIds = p.curators.Select(int.Parse).ToList(),
            Name = p.name,
            Description = p.description,
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
        var project = await db.Projects.FindAsync(id);
        if (project is null)
            return Results.NotFound($"Member with ID {id} not found");
        
        return Results.Ok(project);
    }
}