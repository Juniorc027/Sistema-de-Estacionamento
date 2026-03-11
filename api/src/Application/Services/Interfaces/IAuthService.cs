using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.Auth;

namespace ParkingSystem.Application.Services.Interfaces;

public interface IAuthService
{
    Task<ApiResponse<LoginResponseDto>> LoginAsync(LoginRequestDto request);
    Task<ApiResponse<object>> RegisterAsync(RegisterUserDto request);
}
