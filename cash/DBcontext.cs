using Microsoft.EntityFrameworkCore;  // 👈 КРИТИЧНО: без этого DbContext не найдётся
using cash.Models;
namespace DBContext;  // Или YourNamespace.Data

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // 🔹 Пример DbSet - замените на свои сущности
    // public DbSet<User> Users { get; set; }

    public DbSet<Team> Teams { get; set; } = null!;
    public DbSet<Meeting> Meetings { get; set; } = null!;
    public DbSet<Curator> Curators {get; set; } = null!;
    public DbSet<Project> Projects {get; set; } = null!;
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        // Настройка схем, индексов, ограничений
        // modelBuilder.Entity<User>(entity => { ... });
    }
}