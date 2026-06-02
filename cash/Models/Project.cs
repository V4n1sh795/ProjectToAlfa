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
    [Column("goal")]
    public string Main_Goal { get; init; } = string.Empty;
    [Required]
    [Column("result")]
    public string Results { get; init; } = string.Empty;
    [Required]
    [Column("roles")]
    public string Roles { get; init; } = string.Empty;
    [Required]
    [Column("technology")]
    public string Technology { get; init; } = string.Empty;

    [Required]
    [Column("Curator_ids")]
    public List<int> CuratorIds { get; init; } = new List<int>();

    [Required]
    [Column("startDate")]
    public string StartDate { get; init; } = string.Empty;

    [Required]
    [Column("endDate")]
    public string EndDate { get; init; } = string.Empty;

    [Required]
    [Column("Semester")]
    public string Semester { get; init; } = string.Empty;

    [Column("status")]
    public string status {get; set; } = "idea";

    [Column("statusReason")]
    public string statusReason {get; set; } = string.Empty;

    [Column("archiveReason")]
    public string archiveReason {get; set; } = string.Empty;
    // [Required]
    // [Column("Status")]
    // public bool Status { get; set; } = true;
}