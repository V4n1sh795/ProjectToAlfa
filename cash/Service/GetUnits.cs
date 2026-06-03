using Microsoft.EntityFrameworkCore;
using cash.Models;
using DBContext;
namespace Service;

static class GetUnits
{
    record OMemeber
    {
        public int id {get; set;}
        public int? Team_id {get; set;}
        public string Name {get; set;}
        public string Teamname {get; set;}
        public string conntacts {get; set;}
        public string comment {get; set;}
        public List<ProfileRec1> profiles {get; set;} = new List<ProfileRec1>();
    }
    public record ProfileRec1
    {
        public int ProfileId {get; set;}
        public string MetaData {get; set;} = string.Empty;
    }
    public static async Task<IResult> Member(AppDbContext db, int id)
    {
        var member = db.Members.Include(m => m.Profiles).FirstOrDefault(m => m.Id == id);
        if (member is null)
            return Results.NotFound($"Member with ID {id} not found");
        else
        {
            var profiles = member.Profiles;
            List<ProfileRec1> sprofiles = new List<ProfileRec1>();
            foreach (var profile in profiles)
            {
                ProfileRec1 prof = new ProfileRec1
                {
                    ProfileId = profile.Id,
                    MetaData = $"{profile.Role} {profile.Stack} {profile.GroupNumber}"
                };
                sprofiles.Add(prof);
            }
            var response = new OMemeber
            {
                id = member.Id,
                Team_id = member.TeamId,
                conntacts = member.conntacts,
                comment = member.comments,
                Name = $"{member.Surname} {member.Name} {member.SecondName}",
                Teamname = db.Teams.FirstOrDefault(t => t.Id == member.TeamId).Name,
                profiles = sprofiles
            };
            return Results.Ok(response);    
        }
        
    }
    
    
    
}