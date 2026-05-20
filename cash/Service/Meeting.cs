using Microsoft.EntityFrameworkCore;
using cash.Models;
using DBContext;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.AspNetCore.Mvc;
namespace Service;

class Meeting
{
    public record Status
    {
        public string status {get; set; } = string.Empty;
    }
    public record OMeet
    {
        public string TeamName {get; set; }= string.Empty;
        public string CaseName {get; set; }= string.Empty;
        public DateTime date {get; set; }
        public TimeOnly startAt {get; set; }
        public string status {get; set; }= string.Empty;
        public List<string> participants {get; set; } = new List<string>();
    }
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
    public static async Task<IResult> GetWeek(AppDbContext db, DateTime monday_date)
    {   
        DateTime startLocal = monday_date.Date;
        
        var date = DateTime.SpecifyKind(startLocal, DateTimeKind.Utc);

        List<OMeet> response = new List<OMeet>();
        for (int i = 0; i < 7; i++)
        {
            List<cash.Models.Meeting> day_meets = await db.Meetings.Where(m => m.Date.Date == date.AddDays(i)).ToListAsync();
            foreach (var meet in day_meets)
            {
                List<string> pepes = new List<string>();
                cash.Models.Team? team = db.Teams.Include(t => t.Members).FirstOrDefault(t => t.Id == meet.TeamId);
                cash.Models.Project? proj = await db.Projects.FindAsync(team.ProjectId);
                foreach (var pepe in team.Members)
                {
                    pepes.Add($"{pepe.Surname} {pepe.Name} {pepe.SecondName}");
                }
                OMeet omeet = new OMeet
                {
                    TeamName = team.Name,
                    CaseName = proj.Name,
                    date = meet.Date,
                    startAt = meet.Time,
                    status = meet.Status,
                    participants = pepes
                };
                response.Add(omeet);
            }
        }
        return Results.Ok(response);
    }
    public static async Task<IResult> WhoWasCurators(AppDbContext db, int id)
    {
        cash.Models.Meeting meet = await db.Meetings.FindAsync(id);
        List<string> curators = await db.Curators.Where(c => meet.WasCurators.Contains(c.Id))
                                                 .Select(c => c.Name)
                                                 .ToListAsync();
        return Results.Ok(curators);
    }
    public static async Task<IResult> WhoWasMembers(AppDbContext db, int id)
    {
        cash.Models.Meeting meet = await db.Meetings.FindAsync(id);
        List<string> members = await db.Members.Where(m => meet.WasMembers.Contains(m.Id))
                                               .Select(m => $"{m.Surname} {m.Name} {m.SecondName}")
                                               .ToListAsync();
        return Results.Ok(members);
    }
    public static async Task<IResult> SetWhoWasCurators(AppDbContext db, int id, [FromBody] List<int> CuratorsList)
    {
        cash.Models.Meeting meet = await db.Meetings.FindAsync(id);
        meet.WasCurators.AddRange(CuratorsList);
        await db.SaveChangesAsync();
        return Results.Ok(meet.WasCurators);
    }
    public static async Task<IResult> SetWhoWasMembers(AppDbContext db, int id, [FromBody] List<int> MembersList)
    {
        cash.Models.Meeting meet = await db.Meetings.FindAsync(id);
        meet.WasMembers.AddRange(MembersList);
        await db.SaveChangesAsync();
        return Results.Ok(meet.WasMembers);
    }
    // public static async Task<IResult> SetWhoWasCurators(AppDbContext db, int id)
    // {
    //     cash.Models.Meeting meet = await db.Meetings.FindAsync(id);

    // }
    // public static async Task<IResult> SetWhoWasMembers(AppDbContext db, int id)
    // {
    //     cash.Models.Meeting meet = await db.Meetings.FindAsync(id);

    // }
    public static async Task<IResult> SetStatus(AppDbContext db, string id, Status status)
    {
        cash.Models.Meeting? meeting = await db.Meetings.FindAsync(id);
        meeting.Status = status.status;
        await db.SaveChangesAsync();
        return Results.Ok(meeting);
    }
}