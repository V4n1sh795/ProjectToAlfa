using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace cash.InputModels
{
    class Meeting
    {
        [Required]
        public string Date {get; set; }
        [Required]
        public string Time {get; set; }
    }
    class Register
    {
        [Required]
        public string name {get; set; }
        [Required]
        public string email {get; set; }
        [Required]
        public string password {get; set; }
    }
    class Auth
    {
        [Required]
        public string email {get; set; }
        [Required]
        public string password {get; set; }
    }
}