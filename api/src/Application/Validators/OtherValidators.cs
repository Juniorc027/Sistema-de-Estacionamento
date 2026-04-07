using FluentValidation;
using ParkingSystem.Application.DTOs.ParkingSpot;
using ParkingSystem.Application.DTOs.VehicleEntry;
using ParkingSystem.Application.DTOs.Payment;

namespace ParkingSystem.Application.Validators;

public class CreateParkingSpotValidator : AbstractValidator<CreateParkingSpotDto>
{
    public CreateParkingSpotValidator()
    {
        RuleFor(x => x.SpotNumber)
            .NotEmpty()
            .Matches(@"^(00[1-9]|0[1][0-9]|02[0-2])$")
            .WithMessage("SpotNumber deve estar entre 001 e 022.");

        RuleFor(x => x.ParkingLotId).NotEmpty();
    }
}

public class RegisterVehicleEntryValidator : AbstractValidator<RegisterVehicleEntryDto>
{
    public RegisterVehicleEntryValidator()
    {
        RuleFor(x => x.LicensePlate)
            .NotEmpty()
            .MaximumLength(10)
            .Matches(@"^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$|^[A-Z]{3}[0-9]{4}$")
            .WithMessage("Placa inválida. Use o formato Mercosul (ABC1D23) ou antigo (ABC1234).");
        RuleFor(x => x.ParkingLotId).NotEmpty();
    }
}

public class ProcessPaymentValidator : AbstractValidator<ProcessPaymentDto>
{
    private static readonly string[] AllowedMethods = { "Dinheiro", "Cartão de Débito", "Cartão de Crédito", "PIX" };

    public ProcessPaymentValidator()
    {
        RuleFor(x => x.SessionId).NotEmpty();
        RuleFor(x => x.PaymentMethod)
            .NotEmpty()
            .Must(m => AllowedMethods.Contains(m))
            .WithMessage($"Método de pagamento inválido. Métodos aceitos: {string.Join(", ", AllowedMethods)}");
    }
}
