using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace cash.Models;
[Table("Messages")]
public class Messages
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public int Id { get; init; }

    [Column("chat_id")]
    [Required]
    public int Chat_id { get; init; }
    [Column("sender_id")]
    [Required]
    public int sender_id {get; set; }
    [Column("sender_name")]
    [Required]
    public string sender_name {get; set; }
    [Column("text")]
    [Required]
    public string text {get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}