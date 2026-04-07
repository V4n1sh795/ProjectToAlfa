using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace cash.Models;
[Table("task")] // или ваша схема
public class Task
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("Status")]
    public bool Status { get; set; } // 0 - closed 1 - open

    [Required]
    [Column("Startline", TypeName = "date")]
    public DateTime Startline { get; set; }

    [Required]
    [Column("Deadline", TypeName = "date")]
    public DateTime Deadline { get; set; }

    [Required]
    [Column("Name")]
    public string Name { get; set; } = string.Empty;
}