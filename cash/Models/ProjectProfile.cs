using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("profile")]
public class Profile
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("role")]
    public string Role { get; set; } = string.Empty;

    [Required]
    [Column("Stack")]
    public string Stack { get; set; } = string.Empty;

    [Required]
    [Column("gruop_number")]
    public string GroupNumber { get; set; } = string.Empty;
}