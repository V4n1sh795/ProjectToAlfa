using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using cash.Models;

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
    class Member
    {
        public string name {get; set; }= string.Empty; //FIO
        public string group {get; set; } = string.Empty;
        public string role {get; set; } = string.Empty;
        public string stack {get; set; } = string.Empty;
    }
    class Team
{
    public string callDay { get; set; } = string.Empty;
    public string callTime { get; set; } = string.Empty;
    public List<int> curators { get; set; } = new List<int>();
    public List<cash.InputModels.Member> members { get; set; } = new List<cash.InputModels.Member>();
    public string name { get; set; } = string.Empty;
    public int projectId { get; set; }
}
}