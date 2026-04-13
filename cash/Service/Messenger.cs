using Microsoft.EntityFrameworkCore;
using cash.Models;
using DBContext;
using Microsoft.EntityFrameworkCore.Infrastructure;
namespace Service;

class Messenger
{
    public record IMessage
    {
        public int User_id {get; set;}
        public string User_text {get; set;} = string.Empty;
        public string User_name {get; set;} = string.Empty;
    }
    public static async Task<IResult> SendMessage(AppDbContext db, IMessage message, int id)
    {
        Message mess = new Message
        {
            Chat_id = id,
            sender_id = message.User_id,
            sender_name = message.User_name,
            text = message.User_text,
        };
        await db.Messages.AddAsync(mess);
        return Results.Ok(mess);
    }
    public static async Task<IResult> GetMessages(AppDbContext db, IMessage message, int id)
    {
        return Results.Ok(await db.Messages.Where(m => m.Chat_id == id).ToListAsync());
    }
}