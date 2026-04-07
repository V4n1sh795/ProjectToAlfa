using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace cash.Models;

[Table("team")]
public class Team
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(200)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;
    
    // Для PostgreSQL - хранить как JSONB или отдельную таблицу
    [Column("comments", TypeName = "jsonb")]
    public List<string> Comments { get; set; } = new List<string>();
    
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Required]
    [Column("project_id")]
    public int ProjectId { get; set; }
    
    // Навигационное свойство - ICollection вместо List для EF Core
    public virtual ICollection<Member> Members { get; set; } = new List<Member>();
    
    [Column("curators")]
    public List<int> Curators { get; set; } = new List<int>();

    [Required]
    [Column("call_day")]
    public string CallDay { get; set; } = string.Empty;
    
    [Required]
    [Column("call_time")]
    public string CallTime { get; set; } = string.Empty;

    public List<int> Tasks {get; set; } = new List<int>();
}