using Microsoft.EntityFrameworkCore;
using System.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using cash.Models;
using DBContext;
using System.Text.Json.Nodes;
using System.Text.Json;

namespace Service;
static class Auth
{
    public record IResponse
    {
        public string Messgae {get; set; } = string.Empty;
        public string token {get; set; } = string.Empty;
        public int id {get; set; }
        public string user_name {get; set; } = string.Empty;
    }
    public record IAuth
    {
        public string email {get; set; } = string.Empty;
        public string password {get; set; } = string.Empty;
    }
    public record IRegister
    {
        public string name {get; set; } = string.Empty;
        public string email {get; set; } = string.Empty;
        public string password {get; set; } = string.Empty;
    }
    public static async Task<IResult> Registration(AppDbContext db, IRegister reg)
    {
        var person = await db.Curators
            .Where(u => u.Email == reg.email)
            .FirstOrDefaultAsync();
        if (person == null)
        {
            var hasher = new PasswordHasher<cash.Models.Curator>();
            string hashedPassword = hasher.HashPassword(null, reg.password);
            cash.Models.Curator c = new cash.Models.Curator(reg.name, reg.email, hashedPassword);
            await db.Curators.AddAsync(c);
            await db.SaveChangesAsync();
            var claims = new List<Claim> {new Claim(ClaimTypes.Name, c.Name) };
            var jwt = new JwtSecurityToken(
                issuer: AuthOptions.ISSUER,
                audience: AuthOptions.AUDIENCE,
                claims: claims,
                expires: DateTime.UtcNow.Add(TimeSpan.FromMinutes(60)),
                signingCredentials: new SigningCredentials(AuthOptions.GetSymmetricSecurityKey(), SecurityAlgorithms.HmacSha256));
            var encodedJwt = new JwtSecurityTokenHandler().WriteToken(jwt);
            var data = new IResponse();
            data.Messgae = "Регистрация успешна";
            data.token = encodedJwt;
            data.id = c.Id;
            return Results.Ok(data);
        }
        else
        {
            return Results.BadRequest("Error");
        }
    }
    public static async Task<IResult> Login(AppDbContext db, IAuth auth)
    {
        if (string.IsNullOrEmpty(auth.email) || string.IsNullOrEmpty(auth.password))
        {
            return Results.BadRequest(new { error = "Email and password are required" });
        }
        var person = await db.Curators
            .FirstOrDefaultAsync(u => u.Email == auth.email);
        
        if (person == null)
        {
            return Results.BadRequest(new { error = "InvaServiceslid email or password" });
        }
        
        var hasher = new PasswordHasher<cash.Models.Curator>();
        var verificationResult = hasher.VerifyHashedPassword(null, person.Passwd, auth.password);
        
        if (verificationResult == PasswordVerificationResult.Success)
        {
            var claims = new List<Claim> {new Claim(ClaimTypes.Name, person.Name) };
            var jwt = new JwtSecurityToken(
                issuer: AuthOptions.ISSUER,
                audience: AuthOptions.AUDIENCE,
                claims: claims,
                expires: DateTime.UtcNow.Add(TimeSpan.FromMinutes(60)),
                signingCredentials: new SigningCredentials(AuthOptions.GetSymmetricSecurityKey(), SecurityAlgorithms.HmacSha256));
            var encodedJwt = new JwtSecurityTokenHandler().WriteToken(jwt);

            var response = new IResponse
            {
                Messgae = "Login successful",
                token = encodedJwt,
                id = person.Id,
                user_name = person.Name
            };
            
            return Results.Ok(response);
        }
        
        // Неверный пароль
        return Results.BadRequest(new { error = "Invalid email or password" });
    }
}