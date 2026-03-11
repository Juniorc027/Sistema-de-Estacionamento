using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.Auth;
using ParkingSystem.Application.Services.Interfaces;
using ParkingSystem.Domain.Entities;
using ParkingSystem.Domain.Interfaces;

namespace ParkingSystem.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUnitOfWork _uow;
    private readonly IConfiguration _configuration;

    public AuthService(IUnitOfWork uow, IConfiguration configuration)
    {
        _uow = uow;
        _configuration = configuration;
    }

    public async Task<ApiResponse<LoginResponseDto>> LoginAsync(LoginRequestDto request)
    {
        var user = await _uow.Users.GetByEmailAsync(request.Email);
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return ApiResponse<LoginResponseDto>.Fail("Credenciais inválidas.", 401);

        if (!user.IsActive)
            return ApiResponse<LoginResponseDto>.Fail("Usuário inativo.", 403);

        var token = GenerateJwtToken(user);
        var response = new LoginResponseDto(
            Token: token,
            RefreshToken: Guid.NewGuid().ToString(),
            ExpiresAt: DateTime.UtcNow.AddHours(8),
            UserName: user.Name,
            Role: user.Role);

        return ApiResponse<LoginResponseDto>.Ok(response, "Login realizado com sucesso.");
    }

    public async Task<ApiResponse<object>> RegisterAsync(RegisterUserDto request)
    {
        if (await _uow.Users.ExistsAsync(request.Email))
            return ApiResponse<object>.Fail("E-mail já cadastrado.");

        var user = new User
        {
            Name = request.Name,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = request.Role
        };

        await _uow.Users.AddAsync(user);
        await _uow.CommitAsync();

        return ApiResponse<object>.Created(new { user.Id }, "Usuário criado com sucesso.");
    }

    private string GenerateJwtToken(User user)
    {
        var jwtKey = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured.");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
