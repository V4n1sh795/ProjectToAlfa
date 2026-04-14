using Microsoft.EntityFrameworkCore;
using cash.Models;
using DBContext;

namespace Service.Admin;

public static class AdminEndpoints
{
    // === CURATORS ===
    public static async Task<IResult> GetCurators(AppDbContext db) =>
        Results.Ok(await db.Curators.ToListAsync());

    public static async Task<IResult> GetCurator(AppDbContext db, int id)
    {
        var curator = await db.Curators.FindAsync(id);
        return curator is null ? Results.NotFound() : Results.Ok(curator);
    }

    public static async Task<IResult> CreateCurator(AppDbContext db, CuratorDto dto)
    {
        var curator = new Curator(dto.Name, dto.Email, dto.Passwd);
        await db.Curators.AddAsync(curator);
        await db.SaveChangesAsync();
        return Results.Created($"/api/curator/{curator.Id}", curator);
    }

    public static async Task<IResult> UpdateCurator(AppDbContext db, int id, CuratorDto dto)
    {
        var curator = await db.Curators.FindAsync(id);
        if (curator is null) return Results.NotFound();
        
        curator.Name = dto.Name;
        curator.Email = dto.Email;
        if (!string.IsNullOrEmpty(dto.Passwd))
            curator.Passwd = dto.Passwd;
        
        await db.SaveChangesAsync();
        return Results.Ok(curator);
    }

    public static async Task<IResult> DeleteCurator(AppDbContext db, int id)
    {
        var curator = await db.Curators.FindAsync(id);
        if (curator is null) return Results.NotFound();
        
        db.Curators.Remove(curator);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    // === PROJECTS ===
    public static async Task<IResult> GetProjects(AppDbContext db) =>
        Results.Ok(await db.Projects.ToListAsync());

    public static async Task<IResult> GetProject(AppDbContext db, int id)
    {
        var project = await db.Projects.FindAsync(id);
        return project is null ? Results.NotFound() : Results.Ok(project);
    }

    public static async Task<IResult> CreateProject(AppDbContext db, ProjectDto dto)
    {
        var project = new Project
        {
            Name = dto.Name,
            Description = dto.Description,
            CuratorIds = dto.CuratorIds ?? new List<int>(),
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            Semester = dto.Semester
        };
        await db.Projects.AddAsync(project);
        await db.SaveChangesAsync();
        return Results.Created($"/api/project/{project.Id}", project);
    }

    public static async Task<IResult> UpdateProject(AppDbContext db, int id, ProjectDto dto)
    {
        var project = await db.Projects.FindAsync(id);
        if (project is null) return Results.NotFound();
        
        project.Name = dto.Name;
        project.Description = dto.Description;
        project.CuratorIds = dto.CuratorIds ?? new List<int>();
        project.StartDate = dto.StartDate;
        project.EndDate = dto.EndDate;
        project.Semester = dto.Semester;
        
        await db.SaveChangesAsync();
        return Results.Ok(project);
    }

    public static async Task<IResult> DeleteProject(AppDbContext db, int id)
    {
        var project = await db.Projects.FindAsync(id);
        if (project is null) return Results.NotFound();
        
        db.Projects.Remove(project);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    // === TEAMS ===
    public static async Task<IResult> GetTeams(AppDbContext db) =>
        Results.Ok(await db.Teams.Include(t => t.Members).ToListAsync());

    public static async Task<IResult> GetTeam(AppDbContext db, int id)
    {
        var team = await db.Teams.Include(t => t.Members).FirstOrDefaultAsync(t => t.Id == id);
        return team is null ? Results.NotFound() : Results.Ok(team);
    }

    public static async Task<IResult> CreateTeam(AppDbContext db, TeamDto dto)
    {
        var team = new Team
        {
            Name = dto.Name,
            Comments = dto.Comments ?? new List<string>(),
            ProjectId = dto.ProjectId,
            Curators = dto.Curators ?? new List<int>(),
            CallDay = dto.CallDay,
            CallTime = dto.CallTime,
            Tasks = dto.Tasks ?? new List<int>()
        };
        await db.Teams.AddAsync(team);
        await db.SaveChangesAsync();
        return Results.Created($"/api/team/{team.Id}", team);
    }

    public static async Task<IResult> UpdateTeam(AppDbContext db, int id, TeamDto dto)
    {
        var team = await db.Teams.FindAsync(id);
        if (team is null) return Results.NotFound();
        
        team.Name = dto.Name;
        team.Comments = dto.Comments ?? new List<string>();
        team.ProjectId = dto.ProjectId;
        team.Curators = dto.Curators ?? new List<int>();
        team.CallDay = dto.CallDay;
        team.CallTime = dto.CallTime;
        team.Tasks = dto.Tasks ?? new List<int>();
        
        await db.SaveChangesAsync();
        return Results.Ok(team);
    }

    public static async Task<IResult> DeleteTeam(AppDbContext db, int id)
    {
        var team = await db.Teams.FindAsync(id);
        if (team is null) return Results.NotFound();
        
        db.Teams.Remove(team);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    // === MEMBERS ===
    public static async Task<IResult> GetMembers(AppDbContext db) =>
        Results.Ok(await db.Members.Include(m => m.Profiles).Include(m => m.Team).ToListAsync());

    public static async Task<IResult> GetMember(AppDbContext db, int id)
    {
        var member = await db.Members.Include(m => m.Profiles).Include(m => m.Team).FirstOrDefaultAsync(m => m.Id == id);
        return member is null ? Results.NotFound() : Results.Ok(member);
    }

    public static async Task<IResult> CreateMember(AppDbContext db, MemberDto dto)
    {
        var member = new Member(dto.Name, dto.Surname, dto.SecondName)
        {
            TeamId = dto.TeamId
        };
        await db.Members.AddAsync(member);
        await db.SaveChangesAsync();
        return Results.Created($"/api/member/{member.Id}", member);
    }

    public static async Task<IResult> UpdateMember(AppDbContext db, int id, MemberDto dto)
    {
        var member = await db.Members.FindAsync(id);
        if (member is null) return Results.NotFound();
        
        member.Name = dto.Name;
        member.Surname = dto.Surname;
        member.SecondName = dto.SecondName;
        member.TeamId = dto.TeamId;
        
        await db.SaveChangesAsync();
        return Results.Ok(member);
    }

    public static async Task<IResult> DeleteMember(AppDbContext db, int id)
    {
        var member = await db.Members.FindAsync(id);
        if (member is null) return Results.NotFound();
        
        db.Members.Remove(member);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    // === PROFILES ===
    public static async Task<IResult> GetProfiles(AppDbContext db) =>
        Results.Ok(await db.Profiles.ToListAsync());

    public static async Task<IResult> GetProfile(AppDbContext db, int id)
    {
        var profile = await db.Profiles.FindAsync(id);
        return profile is null ? Results.NotFound() : Results.Ok(profile);
    }

    public static async Task<IResult> CreateProfile(AppDbContext db, ProfileDto dto)
    {
        var profile = new Profile
        {
            Role = dto.Role,
            Stack = dto.Stack,
            GroupNumber = dto.GroupNumber
        };
        await db.Profiles.AddAsync(profile);
        await db.SaveChangesAsync();
        return Results.Created($"/api/profile/{profile.Id}", profile);
    }

    public static async Task<IResult> UpdateProfile(AppDbContext db, int id, ProfileDto dto)
    {
        var profile = await db.Profiles.FindAsync(id);
        if (profile is null) return Results.NotFound();
        
        profile.Role = dto.Role;
        profile.Stack = dto.Stack;
        profile.GroupNumber = dto.GroupNumber;
        
        await db.SaveChangesAsync();
        return Results.Ok(profile);
    }

    public static async Task<IResult> DeleteProfile(AppDbContext db, int id)
    {
        var profile = await db.Profiles.FindAsync(id);
        if (profile is null) return Results.NotFound();
        
        db.Profiles.Remove(profile);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    // === MEETINGS ===
    public static async Task<IResult> GetMeetings(AppDbContext db) =>
        Results.Ok(await db.Meetings.ToListAsync());

    public static async Task<IResult> GetMeeting(AppDbContext db, int id)
    {
        var meeting = await db.Meetings.FindAsync(id);
        return meeting is null ? Results.NotFound() : Results.Ok(meeting);
    }

    public static async Task<IResult> CreateMeeting(AppDbContext db, MeetingDto dto)
    {
        var meeting = new Meeting(dto.Date, dto.Time, dto.TeamId)
        {
            Result = dto.Result,
            Tasks = dto.Tasks ?? new List<int>(),
            Status = dto.Status ?? string.Empty,
            Comments = dto.Comments ?? new List<string>()
        };
        await db.Meetings.AddAsync(meeting);
        await db.SaveChangesAsync();
        return Results.Created($"/api/meeting/{meeting.Id}", meeting);
    }

    public static async Task<IResult> UpdateMeeting(AppDbContext db, int id, MeetingDto dto)
    {
        var meeting = await db.Meetings.FindAsync(id);
        if (meeting is null) return Results.NotFound();
        
        meeting.Date = dto.Date;
        meeting.Time = dto.Time;
        meeting.TeamId = dto.TeamId;
        meeting.Result = dto.Result;
        meeting.Tasks = dto.Tasks ?? new List<int>();
        meeting.Status = dto.Status ?? string.Empty;
        meeting.Comments = dto.Comments ?? new List<string>();
        
        await db.SaveChangesAsync();
        return Results.Ok(meeting);
    }

    public static async Task<IResult> DeleteMeeting(AppDbContext db, int id)
    {
        var meeting = await db.Meetings.FindAsync(id);
        if (meeting is null) return Results.NotFound();
        
        db.Meetings.Remove(meeting);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    // === TASKS ===
    public static async Task<IResult> GetTasks(AppDbContext db) =>
        Results.Ok(await db.Tasks.ToListAsync());

    public static async Task<IResult> GetTask(AppDbContext db, int id)
    {
        var task = await db.Tasks.FindAsync(id);
        return task is null ? Results.NotFound() : Results.Ok(task);
    }

    public static async Task<IResult> CreateTask(AppDbContext db, TaskDto dto)
    {
        var task = new cash.Models.Task
        {
            Status = dto.Status,
            Startline = dto.Startline,
            Deadline = dto.Deadline,
            Name = dto.Name
        };
        await db.Tasks.AddAsync(task);
        await db.SaveChangesAsync();
        return Results.Created($"/api/task/{task.Id}", task);
    }

    public static async Task<IResult> UpdateTask(AppDbContext db, int id, TaskDto dto)
    {
        var task = await db.Tasks.FindAsync(id);
        if (task is null) return Results.NotFound();
        
        task.Status = dto.Status;
        task.Startline = dto.Startline;
        task.Deadline = dto.Deadline;
        task.Name = dto.Name;
        
        await db.SaveChangesAsync();
        return Results.Ok(task);
    }

    public static async Task<IResult> DeleteTask(AppDbContext db, int id)
    {
        var task = await db.Tasks.FindAsync(id);
        if (task is null) return Results.NotFound();
        
        db.Tasks.Remove(task);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }
}

// DTO Classes
public record CuratorDto(string Name, string Email, string Passwd);
public record ProjectDto(string Name, string Description, List<int>? CuratorIds, string StartDate, string EndDate, string Semester);
public record TeamDto(string Name, List<string>? Comments, int ProjectId, List<int>? Curators, string CallDay, string CallTime, List<int>? Tasks);
public record MemberDto(string Name, string Surname, string SecondName, int? TeamId);
public record ProfileDto(string Role, string Stack, string GroupNumber);
public record MeetingDto(DateTime Date, TimeOnly Time, int TeamId, short Result, List<int>? Tasks, string? Status, List<string>? Comments);
public record TaskDto(bool Status, DateTime Startline, DateTime Deadline, string Name);
