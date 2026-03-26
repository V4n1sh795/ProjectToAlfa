using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using cash.Models;

namespace cash.Response
{
    class Response
    {
        public string Messgae {get; set; }
        public string token {get; set; }
        public int id {get; set; }
        public string user_name {get; set; }
    }
}