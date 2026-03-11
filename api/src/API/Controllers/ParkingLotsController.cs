using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.ParkingLot;
using ParkingSystem.Application.Services.Interfaces;

namespace ParkingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ParkingLotsController : ControllerBase
{
    private readonly IParkingLotService _service;
    private readonly IValidator<CreateParkingLotDto> _createValidator;
    private readonly IValidator<UpdateParkingLotDto> _updateValidator;

    public ParkingLotsController(IParkingLotService service,
        IValidator<CreateParkingLotDto> createValidator,
        IValidator<UpdateParkingLotDto> updateValidator)
    {
        _service = service;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    /// <summary>Lista todos os estacionamentos</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();
        return StatusCode(result.StatusCode, result);
    }

    /// <summary>Busca estacionamento por ID</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        return StatusCode(result.StatusCode, result);
    }

    /// <summary>Cria novo estacionamento com vagas automáticas</summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateParkingLotDto request)
    {
        var validation = await _createValidator.ValidateAsync(request);
        if (!validation.IsValid)
            return BadRequest(ApiResponse<object>.Fail("Dados inválidos.", 400, validation.Errors.Select(e => e.ErrorMessage)));

        var result = await _service.CreateAsync(request);
        return StatusCode(result.StatusCode, result);
    }

    /// <summary>Atualiza dados do estacionamento</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateParkingLotDto request)
    {
        var validation = await _updateValidator.ValidateAsync(request);
        if (!validation.IsValid)
            return BadRequest(ApiResponse<object>.Fail("Dados inválidos.", 400, validation.Errors.Select(e => e.ErrorMessage)));

        var result = await _service.UpdateAsync(id, request);
        return StatusCode(result.StatusCode, result);
    }

    /// <summary>Remove estacionamento (soft delete)</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _service.DeleteAsync(id);
        return StatusCode(result.StatusCode, result);
    }
}
