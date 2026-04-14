using Microsoft.EntityFrameworkCore;
using DBContext;
using cash.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;


var builder = WebApplication.CreateBuilder(args);

// 🔧 1. Логирование
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();
if (builder.Environment.IsDevelopment())
{
    builder.Logging.SetMinimumLevel(LogLevel.Debug);
}



// JWT

TokenValidationParameters tvp =  new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = AuthOptions.ISSUER,
            ValidateAudience = true,
            ValidAudience = AuthOptions.AUDIENCE,
            ValidateLifetime = true,
            IssuerSigningKey = AuthOptions.GetSymmetricSecurityKey(),
            ValidateIssuerSigningKey = true
         };
builder.Services.AddAuthorization();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = tvp;
});
// Класс фоновой службы


// Регистрация в Program.cs


// 🔧 2. Конфигурация
builder.Configuration
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true)
    .AddEnvironmentVariables()
    .AddCommandLine(args);

builder.Services.AddCors();
// 🔧 3. PostgreSQL
var postgresConnectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(postgresConnectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(5, TimeSpan.FromSeconds(30), null);
    }));

// === Создание приложения ===
var app = builder.Build();
app.UseCors(builder => builder.AllowAnyOrigin());
app.UseAuthentication();
app.UseAuthorization();
app.Urls.Add("http://0.0.0.0:8080");


// Применеие миграций
await using (var scope = app.Services.CreateAsyncScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await context.Database.MigrateAsync();
}


// app.UseHttpsRedirection();


app.MapGet("/", () => Results.Ok(new { message = "API is running" }));

app.MapGet("/get_team", async (AppDbContext db) => Results.Ok(await db.Teams.ToListAsync()));

app.MapGet("/members", async (AppDbContext db) => Results.Ok(await db.Members.ToArrayAsync()));

app.MapGet("/profiles", async (AppDbContext db) => Results.Ok(await db.Profiles.ToArrayAsync()));

app.MapGet("/project", async (AppDbContext db) => Results.Ok( await db.Projects.ToListAsync()));

app.MapGet("member/{id:int}", Service.GetUnits.Member);

app.MapGet("team/{id:int}", Service.Team.GTeam);

app.MapGet("curator/{id:int}", Service.Curator.GCurator);

app.MapGet("project/{id:int}", Service.Project.GProject);

app.MapPost("/team", Service.Team.CreateTeam);

app.MapPost("/auth/login", Service.Auth.Login);

app.MapPost("/auth/register",Service.Auth.Registration);

app.MapGet("/auth/verify", [Authorize] () => Results.Ok("Token is valid"));

app.MapGet("/curators", Service.Curator.GCurators);

app.MapPost("/project", Service.Project.Create).RequireAuthorization();

app.MapGet("/day/{date:datetime}", Service.Meeting.Day);

app.MapGet("/day/", async (AppDbContext db) => Results.Ok(await db.Meetings.ToListAsync()));

// === ADMIN API ENDPOINTS ===
var admin = app.MapGroup("/api/admin").RequireAuthorization();

// Curators
admin.MapGet("/curators", Service.Admin.AdminEndpoints.GetCurators);
admin.MapGet("/curator/{id:int}", Service.Admin.AdminEndpoints.GetCurator);
admin.MapPost("/curator", Service.Admin.AdminEndpoints.CreateCurator);
admin.MapPut("/curator/{id:int}", Service.Admin.AdminEndpoints.UpdateCurator);
admin.MapDelete("/curator/{id:int}", Service.Admin.AdminEndpoints.DeleteCurator);

// Projects
admin.MapGet("/projects", Service.Admin.AdminEndpoints.GetProjects);
admin.MapGet("/project/{id:int}", Service.Admin.AdminEndpoints.GetProject);
admin.MapPost("/project", Service.Admin.AdminEndpoints.CreateProject);
admin.MapPut("/project/{id:int}", Service.Admin.AdminEndpoints.UpdateProject);
admin.MapDelete("/project/{id:int}", Service.Admin.AdminEndpoints.DeleteProject);

// Teams
admin.MapGet("/teams", Service.Admin.AdminEndpoints.GetTeams);
admin.MapGet("/team/{id:int}", Service.Admin.AdminEndpoints.GetTeam);
admin.MapPost("/team", Service.Admin.AdminEndpoints.CreateTeam);
admin.MapPut("/team/{id:int}", Service.Admin.AdminEndpoints.UpdateTeam);
admin.MapDelete("/team/{id:int}", Service.Admin.AdminEndpoints.DeleteTeam);

// Members
admin.MapGet("/members", Service.Admin.AdminEndpoints.GetMembers);
admin.MapGet("/member/{id:int}", Service.Admin.AdminEndpoints.GetMember);
admin.MapPost("/member", Service.Admin.AdminEndpoints.CreateMember);
admin.MapPut("/member/{id:int}", Service.Admin.AdminEndpoints.UpdateMember);
admin.MapDelete("/member/{id:int}", Service.Admin.AdminEndpoints.DeleteMember);

// Profiles
admin.MapGet("/profiles", Service.Admin.AdminEndpoints.GetProfiles);
admin.MapGet("/profile/{id:int}", Service.Admin.AdminEndpoints.GetProfile);
admin.MapPost("/profile", Service.Admin.AdminEndpoints.CreateProfile);
admin.MapPut("/profile/{id:int}", Service.Admin.AdminEndpoints.UpdateProfile);
admin.MapDelete("/profile/{id:int}", Service.Admin.AdminEndpoints.DeleteProfile);

// Meetings
admin.MapGet("/meetings", Service.Admin.AdminEndpoints.GetMeetings);
admin.MapGet("/meeting/{id:int}", Service.Admin.AdminEndpoints.GetMeeting);
admin.MapPost("/meeting", Service.Admin.AdminEndpoints.CreateMeeting);
admin.MapPut("/meeting/{id:int}", Service.Admin.AdminEndpoints.UpdateMeeting);
admin.MapDelete("/meeting/{id:int}", Service.Admin.AdminEndpoints.DeleteMeeting);

// Tasks
admin.MapGet("/tasks", Service.Admin.AdminEndpoints.GetTasks);
admin.MapGet("/task/{id:int}", Service.Admin.AdminEndpoints.GetTask);
admin.MapPost("/task", Service.Admin.AdminEndpoints.CreateTask);
admin.MapPut("/task/{id:int}", Service.Admin.AdminEndpoints.UpdateTask);
admin.MapDelete("/task/{id:int}", Service.Admin.AdminEndpoints.DeleteTask);

app.MapPost("/task/{day:datetime}", Service.Meeting.AddTask);

app.MapPost("/task/{taskId:int}", Service.Meeting.CloseTask);

app.MapGet("task/{id:int}", Service.Meeting.GTask);

app.MapPost("meeting/comment/{meetingId:int}", Service.Meeting.AddComment);

app.MapPost("message/{chat_id:int}", Service.Messenger.SendMessage);

app.MapGet("message/{chat_id:int}", Service.Messenger.GetMessages);
// app.MapPost("message/{chat_id:int}", [Authorize] async (AppDbContext db, int chat_id, Messages message) =>
// {
//     db.Messages.AddAsync(message);
//     db.SaveChangesAsync();
//     return Results.Ok("message_sended");
// });

// app.MapGet("message/{projectId:int}", [Authorize] async (AppDbContext db, int projectId) =>
// {
//     // Получаем все сообщения, ID которых есть в списке chatIds
//     var messages = await db.Messages
//         .Where(m => m.Chat_id == projectId) // или m.ChatId, зависит от вашей модели
//         .ToListAsync();
//     return messages;
// });



await app.RunAsync();


