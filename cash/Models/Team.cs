using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace cash.Models;
[Table("team")]
public class Team
{
    [Key, DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    public List<string> Comments { get; set; } = new List<string>();
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Required]
    public virtual Project Project {get; set;} = new Project();
    [Required]
    public List<Member> members = new List<Member>();
    [Required]
    public List<Curator> curators = new List<Curator>();

}