using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel;
namespace cash.Models;

[Table("member")]
public record Member
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Required]
    [Column("surname")]
    public string Surname { get; set; } = string.Empty;

    [Required]
    [Column("second_name")]
    public string SecondName { get; set; } = string.Empty;

    // Если у одного члена несколько профилей
    public virtual ICollection<Profile> Profiles { get; set; } = new List<Profile>();
    
    [Column("team_id")]
    public int? TeamId { get; set; }

    [ForeignKey(nameof(TeamId))]
    public virtual Team? Team { get; set; }

    [Column("contacts")]
    [DefaultValue("+79000000000")]
    public string conntacts {get; set; } = string.Empty;

    [Column("comments")]
    [DefaultValue("")]
    public string comments {get; set; } = string.Empty;
    public Member() { }
    
    public Member(string name, string surname, string secondname)
    {
        Name = name;
        Surname = surname;
        SecondName = secondname;
    }
}