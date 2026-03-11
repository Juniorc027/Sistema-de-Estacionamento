using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.VehicleEntry;
using ParkingSystem.Application.Services.Interfaces;

namespace ParkingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VehicleEntriesController : ControllerBase
{
    private readonly IVehicleEntryService _service;
    private readonly IValidator<RegisterVehicleEntryDto> _registerValidator;

    public VehicleEntriesController(IVehicleEntryService service, IValidator<RegisterVehicleEntryDto> registerValidator)
    {
        _service = service;
        _registerValidator = registerValidator;
    }

    /// <summary>Registra entrada de veículo pela cancela</summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterVehicleEntryDto request)
    {
        var validation = await _registerValidator.ValidateAsync(request);
        if (!validation.IsValid)
            return BadRequest(ApiResponse<object>.Fail("Dados inválidos.", 400, validation.Errors.Select(e => e.ErrorMessage)));

        var result = await _service.RegisterEntryAsync(request);
        return StatusCode(result.StatusCode, result);
    }

    /// <summary>Lista entradas pendentes (aguardando vaga)</summary>
    [HttpGet("pending/{parkingLotId:guid}")]
    public async Task<IActionResult> GetPending(Guid parkingLotId)
    {
        var result = await _service.GetPendingAsync(parkingLotId);
        return StatusCode(result.StatusCode, result);
    }

    /// <summary>Lista todas as entradas de um estacionamento</summary>
    [HttpGet("by-lot/{parkingLotId:guid}")]
    public async Task<IActionResult> GetAll(Guid parkingLotId)
    {
        var result = await _service.GetAllAsync(parkingLotId);
        return StatusCode(result.StatusCode, result);
    }
}
