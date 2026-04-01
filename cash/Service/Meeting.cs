using Microsoft.EntityFrameworkCore;
using cash.Models;
using DBContext;
namespace Service;

class Meeting
{
    public static async Task<IResult> Day(AppDbContext db, DateTime date)
    {
        var startLocal = date.Date;
        
        var startUtc = DateTime.SpecifyKind(startLocal, DateTimeKind.Utc);
        var endUtc = startUtc.AddDays(1);
        
        var meetings = await db.Meetings
            .Where(m => m.Date >= startUtc && m.Date < endUtc)
            .ToListAsync();
        
        return Results.Ok(meetings);
    }
}