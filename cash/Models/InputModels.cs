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
    class Project
    {
        public string name {get; set;}
        public string description {get; set;}
        public string endDate {get; set;}
        public string startDate {get; set;}
        public List<string> curators {get; set;}
        public string semester {get; set;}
        
    }
}