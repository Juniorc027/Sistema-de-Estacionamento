using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.Payment;
using ParkingSystem.Application.Services.Interfaces;

namespace ParkingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _service;
    private readonly IValidator<ProcessPaymentDto> _validator;

    public PaymentsController(IPaymentService service, IValidator<ProcessPaymentDto> validator)
    {
        _service = service;
        _validator = validator;
    }

    /// <summary>Processa pagamento de uma sessão encerrada</summary>
    [HttpPost("process")]
    public async Task<IActionResult> Process([FromBody] ProcessPaymentDto request)
    {
        var validation = await _validator.ValidateAsync(request);
        if (!validation.IsValid)
            return BadRequest(ApiResponse<object>.Fail("Dados inválidos.", 400, validation.Errors.Select(e => e.ErrorMessage)));

        var result = await _service.ProcessPaymentAsync(request);
        return StatusCode(result.StatusCode, result);
    }

    /// <summary>Lista pagamentos por período</summary>
    [HttpGet]
    public async Task<IActionResult> GetByPeriod([FromQuery] DateTime from, [FromQuery] DateTime to)
    {
        var result = await _service.GetByPeriodAsync(from, to);
        return StatusCode(result.StatusCode, result);
    }

    /// <summary>Busca pagamento de uma sessão</summary>
    [HttpGet("session/{sessionId:guid}")]
    public async Task<IActionResult> GetBySession(Guid sessionId)
    {
        var result = await _service.GetBySessionAsync(sessionId);
        return StatusCode(result.StatusCode, result);
    }
}
