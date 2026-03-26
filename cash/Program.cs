using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;
using StackExchange.Redis;
using System;
using System.Threading.Tasks;
using DBContext;
using Microsoft.VisualBasic;
using System.Formats.Tar;
using System.Linq.Expressions;
using System.Xml; // 👈 пространство имён, где лежит AppDbContext
using cash.Models;
using System.Data.Common;
using System.Data;
using System.Reflection;
using System.Reflection.Metadata.Ecma335;
using System.Text.Json.Nodes;
using System.Text.Json;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
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

// 🔧 4. Redis
var redisConnectionString = builder.Configuration.GetConnectionString("Redis")
    ?? $"{builder.Configuration["Redis:Host"] ?? "redis_container"}:6379,password={builder.Configuration["Redis:Password"]},user={builder.Configuration["Redis:User"]}";

builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
{
    var config = ConfigurationOptions.Parse(redisConnectionString);
    config.AbortOnConnectFail = false;
    config.ConnectTimeout = 5000;
    config.SyncTimeout = 5000;
    return ConnectionMultiplexer.Connect(config);
});





// === Создание приложения ===
var app = builder.Build();
app.UseCors(builder => builder.AllowAnyOrigin());
app.UseAuthentication();
app.UseAuthorization();
app.Urls.Add("http://0.0.0.0:8080");


// // Применеие миграций
// await using (var scope = app.Services.CreateAsyncScope())
// {
//     var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
//     await context.Database.MigrateAsync();
// }


// app.UseHttpsRedirection();
// 🔧 Тестовые эндпоинты


app.MapGet("/", () => Results.Ok(new 
{ 
    message = "API is running",
}));
app.MapGet("/get_team", async (AppDbContext db) =>
{
    // Получаем все команды из БД
    var allTeams = await db.Teams.ToListAsync();
    
    return Results.Ok(allTeams);
});
app.MapGet("/reallydeleteallteams", async (AppDbContext db) =>
{
    var allTeams = await db.Teams.ToListAsync();
    
    db.Teams.RemoveRange(allTeams);
    
    await db.SaveChangesAsync();
    
    return Results.Ok(new { message = $"Deleted {allTeams.Count} teams" });
});

app.MapPost("/team", async (AppDbContext db, Team team) =>
{   
    await db.Teams.AddAsync(team);
    await db.SaveChangesAsync();
    
    return Results.Created($"/team/{team.Id}", team);
});

app.MapGet("/day/{date:datetime}", async (AppDbContext db, DateTime date) =>
{
    // 1. Приводим дату к началу дня в локальном времени
    var startLocal = date.Date; // 2026-03-25 00:00:00
    
    // 2. Конвертируем в UTC (как хранится в БД)
    var startUtc = DateTime.SpecifyKind(startLocal, DateTimeKind.Utc);
    var endUtc = startUtc.AddDays(1); // 2026-03-26 00:00:00 UTC
    
    // 3. Запрос по диапазону (эффективно + использует индекс)
    var meetings = await db.Meetings
        .Where(m => m.Date >= startUtc && m.Date < endUtc)
        .ToListAsync();
    
    return Results.Ok(meetings);
});
app.MapGet("/day/", async (AppDbContext db) =>
{
    var meetings = await db.Meetings.ToListAsync();

    return Results.Ok(meetings);
});

app.MapPost("/meeting/", async (AppDbContext db, HttpContext httpContext) =>
{
    
    using StreamReader reader = new StreamReader(httpContext.Request.Body);
    string name = await reader.ReadToEndAsync();

    var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
    var data = JsonSerializer.Deserialize<cash.InputModels.Meeting>(name, options);
    if(DateTime.TryParse(data.Date, out DateTime result) && TimeOnly.TryParse(data.Time, out TimeOnly result1))
    {
        DateTime date = result;
        TimeOnly time = result1;

        DateTime utcDate = DateTime.SpecifyKind(date, DateTimeKind.Utc);

        Meeting meet = new Meeting(utcDate, time, 152);
        await db.Meetings.AddAsync(meet);
        await db.SaveChangesAsync();
        return "OK: Added to db";
    }
    else
    {
        return "ERROR: Not added to db";
    }
});

app.MapPost("/auth/login", async (AppDbContext db, cash.InputModels.Auth auth) =>
{
    if (string.IsNullOrEmpty(auth.email) || string.IsNullOrEmpty(auth.password))
    {
        return Results.BadRequest(new { error = "Email and password are required" });
    }
    var person = await db.Curators
        .FirstOrDefaultAsync(u => u.Email == auth.email);
    
    if (person == null)
    {
        return Results.BadRequest(new { error = "Invalid email or password" });
    }
    
    var hasher = new PasswordHasher<Curator>();
    var verificationResult = hasher.VerifyHashedPassword(null, person.Passwd, auth.password);
    
    if (verificationResult == PasswordVerificationResult.Success)
    {
        var claims = new List<Claim> {new Claim(ClaimTypes.Name, person.Name) };
        var jwt = new JwtSecurityToken(
            issuer: AuthOptions.ISSUER,
            audience: AuthOptions.AUDIENCE,
            claims: claims,
            expires: DateTime.UtcNow.Add(TimeSpan.FromMinutes(60)),
            signingCredentials: new SigningCredentials(AuthOptions.GetSymmetricSecurityKey(), SecurityAlgorithms.HmacSha256));
        var encodedJwt = new JwtSecurityTokenHandler().WriteToken(jwt);

        var response = new cash.Response.Response
        {
            Messgae = "Login successful",
            token = encodedJwt,
            id = person.Id,
            user_name = person.Name
        };
        
        return Results.Ok(response);
    }
    
    // Неверный пароль
    return Results.BadRequest(new { error = "Invalid email or password" });
});

app.MapPost("/auth/register", async (AppDbContext db, cash.InputModels.Register reg) =>
{
    var person = await db.Curators
        .Where(u => u.Email == reg.email)
        .FirstOrDefaultAsync();
    if (person == null)
    {
        var hasher = new PasswordHasher<Curator>();
        string hashedPassword = hasher.HashPassword(null, reg.password);
        Curator c = new Curator(reg.name, reg.email, hashedPassword);
        await db.Curators.AddAsync(c);
        await db.SaveChangesAsync();
        var claims = new List<Claim> {new Claim(ClaimTypes.Name, c.Name) };
        var jwt = new JwtSecurityToken(
            issuer: AuthOptions.ISSUER,
            audience: AuthOptions.AUDIENCE,
            claims: claims,
            expires: DateTime.UtcNow.Add(TimeSpan.FromMinutes(60)),
            signingCredentials: new SigningCredentials(AuthOptions.GetSymmetricSecurityKey(), SecurityAlgorithms.HmacSha256));
        var encodedJwt = new JwtSecurityTokenHandler().WriteToken(jwt);
        var data = new cash.Response.Response();
        data.Messgae = "Регистрация успешна";
        data.token = encodedJwt;
        data.id = c.Id;
        return Results.Ok(data);
    }
    else
    {
        return Results.BadRequest("Error");
    }
});

app.MapGet("/auth/verify", [Authorize] () => Results.Ok("Token is valid"));

app.MapGet("/curators", async (AppDbContext db) =>
{
    var data = await db.Curators
        .Where(c => c.Name != null && c.Name != "")
        .Select(c => new { c.Id, c.Name })
        .ToListAsync();
    
    return Results.Ok(data);
});

app.MapPost("/project", [Authorize] (AppDbContext db, cash.InputModels.Project p) =>
{
    Project project = new Project
    {
        CuratorIds = p.curators.Select(int.Parse).ToList(),
        Name = p.name,
        Description = p.description,
        StartDate = p.startDate,
        EndDate = p.endDate,
        Semester = p.semester
    };
    db.Projects.AddAsync(project);
    db.SaveChangesAsync();
    return Results.Ok(project);
});

app.MapGet("/project", (AppDbContext db) =>
{
    return db.Projects.ToListAsync();
});

app.MapPost("message/{chat_id:int}", [Authorize] async (AppDbContext db, int chat_id, Messages message) =>
{
    db.Messages.AddAsync(message);
    db.SaveChangesAsync();
    return Results.Ok("message_sended");
});

app.MapGet("message/{projectId:int}", [Authorize] async (AppDbContext db, int projectId) =>
{
    // Получаем все сообщения, ID которых есть в списке chatIds
    var messages = await db.Messages
        .Where(m => m.Chat_id == projectId) // или m.ChatId, зависит от вашей модели
        .ToListAsync();
    return messages;
});

await app.RunAsync();