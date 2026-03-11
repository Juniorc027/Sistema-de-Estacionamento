using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using ParkingSystem.Application.Services;
using ParkingSystem.Application.Services.Interfaces;

namespace ParkingSystem.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IParkingLotService, ParkingLotService>();
        services.AddScoped<IParkingSpotService, ParkingSpotService>();
        services.AddScoped<IVehicleEntryService, VehicleEntryService>();
        services.AddScoped<IParkingSessionService, ParkingSessionService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<IReportService, ReportService>();

        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        return services;
    }
}
