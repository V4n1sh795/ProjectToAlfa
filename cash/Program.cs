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
var builder = WebApplication.CreateBuilder(args);

// 🔧 1. Логирование
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();
if (builder.Environment.IsDevelopment())
{
    builder.Logging.SetMinimumLevel(LogLevel.Debug);
}

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
app.Urls.Add("http://0.0.0.0:8080");


// Применеие миграций
await using (var scope = app.Services.CreateAsyncScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await context.Database.MigrateAsync();
}


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


// 🔧 Миграции при старте (опционально)
// using (var scope = app.Services.CreateScope())
// {
//     var services = scope.ServiceProvider;
//     var logger = services.GetRequiredService<ILogger<Program>>();
    
//     try
//     {
//         var context = services.GetRequiredService<AppDbContext>();
//         if (await context.Database.CanConnectAsync())
//         {
//             logger.LogInformation("Applying migrations...");
//             await context.Database.MigrateAsync();
//             logger.LogInformation("Migrations applied");
//         }
//     }
//     catch (Exception ex)
//     {
//         logger.LogError(ex, "Migration error");
//     }
// }

await app.RunAsync();