using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("member")]
public class Member
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("Name")]
    public string Name { get; set; } = string.Empty;

    [Required]
    [Column("Surname")]
    public string Surname { get; set; } = string.Empty;

    [Required]
    [Column("Second Name")]
    public string SecondName { get; set; } = string.Empty;

    [Required]
    [Column("projectprofiles_ids")]
    public List<int> Profile { get; set; } = new List<int>();
}