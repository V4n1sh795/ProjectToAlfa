using Microsoft.EntityFrameworkCore;
using cash.Models;
using DBContext;
using Microsoft.EntityFrameworkCore.Infrastructure;
namespace Service;

class Meeting
{
    public record ITask
    {
        public int teamId {get; set; }
        public string name {get; set; } = string.Empty;
        public string deadline {get; set; } = string.Empty;
    }
    public record IComment
    {
        public string text {get; set; } = string.Empty;
    }
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
    public static async Task<IResult> AddTask(
        AppDbContext db, 
        ITask task, 
        DateTime day)
    {
        var date = DateTime.Parse(task.deadline);
        var DeaddayUtc = DateTime.SpecifyKind(date, DateTimeKind.Utc);
        cash.Models.Task Task = new cash.Models.Task
        {
            Status = true,
            Startline = DateTime.SpecifyKind(DateTime.Today, DateTimeKind.Utc),
            Deadline = DeaddayUtc,
            Name = task.name
        };
        await db.Tasks.AddAsync(Task);
        await db.SaveChangesAsync();

        await AddToAllTables(db, Task, task.teamId);

        return Results.Ok();
    }
    public static async Task<IResult> CloseTask(AppDbContext db, int taskId)
    {
        cash.Models.Task? task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId);
        if (task != null)
        {
            task.Status = false;
            List<cash.Models.Meeting> meetings = await db.Meetings.Where(m => m.Tasks.Contains(taskId)).ToListAsync();
            
            foreach (cash.Models.Meeting meeting in meetings)
            {
                meeting.Tasks.Remove(taskId);
            }
            await db.SaveChangesAsync();
            return Results.Ok();    
        }
        else
        {
            return Results.NotFound("Task with this id doesnt exist");
        }
        
    }
    protected static async System.Threading.Tasks.Task AddToAllTables(
        AppDbContext db,
        cash.Models.Task task,
        int teamId)
    {
        List<cash.Models.Team> teams = await db.Teams
        .Where(t => t.Id == teamId)
        .ToListAsync(); 
        foreach (var team in teams)
        {
            team.Tasks.Add(task.Id);
        }
        List<cash.Models.Meeting> meetings = await db.Meetings
            .Where(m => m.Date > task.Startline && m.TeamId == teamId)
            .OrderBy(m => m.Date)  // по возрастанию даты
            .ToListAsync();
        foreach (cash.Models.Meeting meeting in meetings)
        {
            meeting.Tasks.Add(task.Id);
        }
        await db.SaveChangesAsync();
    }
    public static async Task<IResult> GTask(AppDbContext db, int id)
    {
        return Results.Ok(db.Tasks.Where(t => t.Id == id));
    }
    public static async Task<IResult> AddComment(AppDbContext db, int meetingId, IComment comm)
    {
        cash.Models.Meeting? meeting = db.Meetings.FirstOrDefault(m => m.Id == meetingId);

        if (meeting != null)
        {
            if (meeting.Comments == null)
                meeting.Comments = new List<string>();
            meeting.Comments.Add(comm.text);
            await db.SaveChangesAsync();
            return Results.Ok();
        }
        else
        {
            return Results.NotFound("Meeting with this id doesnt exist");
        };
    }
}