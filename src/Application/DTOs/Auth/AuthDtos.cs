namespace ParkingSystem.Application.DTOs.Auth;

public record LoginRequestDto(string Email, string Password);

public record LoginResponseDto(string Token, string RefreshToken, DateTime ExpiresAt, string UserName, string Role);

public record RegisterUserDto(string Name, string Email, string Password, string Role = "Admin");
