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
        public string comments {get; set;}
        public List<string> profiles {get; set;} = new List<string>();
    }
    public static async Task<IResult> Member(AppDbContext db, int id)
    {
        var member = db.Members.Include(m => m.Profiles).FirstOrDefault(m => m.Id == id);
        if (member is null)
            return Results.NotFound($"Member with ID {id} not found");
        else
        {
            var profiles = member.Profiles;
            List<string> sprofiles = new List<string>();
            foreach (var profile in profiles)
            {
                sprofiles.Add($"{profile.Role} {profile.Stack} {profile.GroupNumber}" );
            }
            var response = new OMemeber
            {
                id = member.Id,
                Team_id = member.TeamId,
                conntacts = member.conntacts,
                comments = member.comments,
                Name = $"{member.Surname} {member.Name} {member.SecondName}",
                Teamname = db.Teams.FirstOrDefault(t => t.Id == member.TeamId).Name,
                profiles = sprofiles
            };
            return Results.Ok(response);    
        }
        
    }
    
    
    
}