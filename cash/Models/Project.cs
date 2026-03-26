using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

/// <summary>
/// Модель проекта (record type)
/// </summary>
namespace cash.Models;
[Table("Project")]
public record Project
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public int Id { get; init; }

    [Required]
    [Column("Name")]
    public string Name { get; init; } = string.Empty;

    [Required]
    [Column("description")]
    public string Description { get; init; } = string.Empty;

    [Required]
    [Column("Curator_ids")]
    public List<int> CuratorIds { get; init; }

    [Column("tasks_id")]
    public List<int> TasksId { get; init; } = new List<int>();

    [Required]
    [Column("startDate")]
    public string StartDate { get; init; }

    [Required]
    [Column("endDate")]
    public string EndDate { get; init; }

    [Required]
    [Column("Semester")]
    public string Semester { get; init; } = string.Empty;

}