using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace cash.Models;

[Table("Curators")]
public class Curator
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    public string Passwd { get; set; } = string.Empty;

    public Curator(string name, string email, string passwd)
    {
        this.Name = name;
        this.Email = email;
        this.Passwd = passwd;
    }
}