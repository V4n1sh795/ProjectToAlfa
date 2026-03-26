using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authorization;
using System.Text;
namespace cash.Models;
public class AuthOptions
{
    public const string ISSUER = "SuperSecurityEvolvedCompanyEvenJWTTokenIsOpenService";
    public const string AUDIENCE = "SuperSecurityEvolvedCompanyEvenJWTTokenIsOpenClient";
    public const string KEY = "SuperSecurityEvolvedCompanyEvenJWTTokenIsOpenServiceKey"; // ключ для шифрации
    public const int LIFETIME = 60; // время жизни токена в минутах

    public static SymmetricSecurityKey GetSymmetricSecurityKey()
    {
        return new SymmetricSecurityKey(Encoding.ASCII.GetBytes(KEY));
    }
}