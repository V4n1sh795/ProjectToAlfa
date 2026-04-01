using Microsoft.EntityFrameworkCore;
using cash.Models;
using DBContext;
namespace Service;

static class Curator
{
    public static async Task<IResult> GCurator(AppDbContext db, int id)
    {
        var curator = await db.Curators.FindAsync(id);
        if (curator is null)
            return Results.NotFound($"Member with ID {id} not found");
        
        return Results.Ok(curator);
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