using Microsoft.EntityFrameworkCore;
using cash.Models;
using DBContext;
namespace Service;

static class GetUnits
{
    public static async Task<IResult> Member(AppDbContext db, int id)
    {
        var member = await db.Members.FindAsync(id);
        if (member is null)
            return Results.NotFound($"Member with ID {id} not found");
        
        return Results.Ok(member);
    }
    
    
    
}