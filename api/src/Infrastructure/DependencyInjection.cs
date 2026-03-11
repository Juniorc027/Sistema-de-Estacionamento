using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ParkingSystem.Application.Services.Interfaces;
using ParkingSystem.Domain.Interfaces;
using ParkingSystem.Infrastructure.Data;
using ParkingSystem.Infrastructure.Services;

namespace ParkingSystem.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<AppDbContext>(options =>
            options.UseMySql(
                connectionString,
                ServerVersion.Parse("8.0.45-mysql"),
                mysql =>
                {
                    mysql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName);
                    mysql.EnableRetryOnFailure(3);
                }));

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddSingleton<IMqttService, MqttService>();

        return services;
    }
}
