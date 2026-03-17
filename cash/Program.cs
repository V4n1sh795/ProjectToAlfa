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
app.Urls.Add("http://0.0.0.0:8080");
app.UseHttpsRedirection();

// 🔧 Тестовые эндпоинты
app.MapGet("/test/postgres", async (AppDbContext db, ILogger<Program> logger) =>
{
    try
    {
        var canConnect = await db.Database.CanConnectAsync();
        logger.LogInformation("PostgreSQL: {Result}", canConnect ? "OK" : "FAILED");
        return Results.Ok(new { status = canConnect ? "connected" : "failed", timestamp = DateTime.UtcNow });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "PostgreSQL error");
        return Results.Problem(
            title: "Database Error",
            detail: ex.Message,
            statusCode: 503);
            }
});

app.MapGet("/test/redis", async (IConnectionMultiplexer redis, ILogger<Program> logger) =>
{
    try
    {
        var db = redis.GetDatabase();
        var key = $"test:{Guid.NewGuid()}";
        await db.StringSetAsync(key, "OK", TimeSpan.FromMinutes(1));
        var val = await db.StringGetAsync(key);
        return Results.Ok(new { status = val == "OK" ? "connected" : "failed", timestamp = DateTime.UtcNow });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Redis error");
        return Results.Problem(
            title: "Database Error",
            detail: ex.Message,
            statusCode: 503);
            }
});

app.MapGet("/", () => Results.Ok(new 
{ 
    message = "API is running",
    endpoints = new[] { "/health", "/test/postgres", "/test/redis", "/swagger" }
}));
app.MapGet("/get_team", async (AppDbContext db) =>
{
    // Создаём новую команду (Id установится автоматически при сохранении)
    var team = new Team
    {
        Name = "first team",
    };
    
    // Добавляем в контекст
    await db.Teams.AddAsync(team);
    await db.SaveChangesAsync();
    
    // Получаем все команды из БД
    var allTeams = await db.Teams.ToListAsync();
    
    return Results.Ok(allTeams);
});

// 🔧 Миграции при старте (опционально)
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        if (await context.Database.CanConnectAsync())
        {
            logger.LogInformation("Applying migrations...");
            await context.Database.MigrateAsync();
            logger.LogInformation("Migrations applied");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Migration error");
    }
}

await app.RunAsync();