using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.ParkingSpot;
using ParkingSystem.Application.Services.Interfaces;

namespace ParkingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ParkingSpotsController : ControllerBase
{
    private readonly IParkingSpotService _service;
    private readonly IValidator<CreateParkingSpotDto> _createValidator;

    public ParkingSpotsController(IParkingSpotService service, IValidator<CreateParkingSpotDto> createValidator)
    {
        _service = service;
        _createValidator = createValidator;
    }

    /// <summary>Lista vagas por estacionamento</summary>
    [HttpGet("by-lot/{parkingLotId:guid}")]
    [AllowAnonymous] // Frontend precisa acessar sem autenticação
    public async Task<IActionResult> GetByLot(Guid parkingLotId)
    {
        var result = await _service.GetByParkingLotAsync(parkingLotId);
        return StatusCode(result.StatusCode, result);
    }

    /// <summary>Busca vaga por ID</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        return StatusCode(result.StatusCode, result);
    }

    /// <summary>Cria nova vaga</summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateParkingSpotDto request)
    {
        var validation = await _createValidator.ValidateAsync(request);
        if (!validation.IsValid)
            return BadRequest(ApiResponse<object>.Fail("Dados inválidos.", 400, validation.Errors.Select(e => e.ErrorMessage)));

        var result = await _service.CreateAsync(request);
        return StatusCode(result.StatusCode, result);
    }

    /// <summary>Remove vaga (soft delete)</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _service.DeleteAsync(id);
        return StatusCode(result.StatusCode, result);
    }
}
