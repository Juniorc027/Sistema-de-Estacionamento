using FluentValidation;
using ParkingSystem.Application.DTOs.ParkingLot;

namespace ParkingSystem.Application.Validators;

public class CreateParkingLotValidator : AbstractValidator<CreateParkingLotDto>
{
    public CreateParkingLotValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Address).NotEmpty().MaximumLength(255);
        RuleFor(x => x.TotalSpots).GreaterThan(0).LessThanOrEqualTo(500);
        RuleFor(x => x.RatePerMinute).GreaterThan(0).LessThanOrEqualTo(100m);
    }
}

public class UpdateParkingLotValidator : AbstractValidator<UpdateParkingLotDto>
{
    public UpdateParkingLotValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Address).NotEmpty().MaximumLength(255);
        RuleFor(x => x.RatePerMinute).GreaterThan(0).LessThanOrEqualTo(100m);
    }
}
