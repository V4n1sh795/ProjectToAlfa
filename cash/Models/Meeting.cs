using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace cash.Models
{
    [Table("Meeting")]
    public class Meeting
    {
        /// <summary>
        /// ID встречи (первичный ключ)
        /// </summary>
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        /// <summary>
        /// Дата встречи
        /// </summary>
        [Column("date")]
        [Required]
        public DateTime Date { get; set; }

        /// <summary>
        /// Время встречи
        /// </summary>
        [Column("time")]
        [Required]
        public TimeOnly Time { get; set; }

        /// <summary>
        /// ID команды
        /// </summary>
        [Column("team_id")]
        public int TeamId { get; set; }

        /// <summary>
        /// Результат встречи
        /// </summary>
        [Column("result")]
        public short Result { get; set; }

        /// <summary>
        /// Количество задач (JSON поле)
        /// </summary>
        [Column("tasks")]
        public List<int> Tasks { get; set; } = new();

        /// <summary>
        /// Статус встречи
        /// </summary>
        [Column("status")]
        [MaxLength(50)]
        public string Status { get; set; } = string.Empty;
        public Meeting(DateTime Date, TimeOnly Time)
        {
            this.Date = Date;
            this.Time = Time;
        }
    }
}