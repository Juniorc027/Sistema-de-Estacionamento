using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParkingSystem.Application.Services.Interfaces;

namespace ParkingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ParkingSessionsController : ControllerBase
{
    private readonly IParkingSessionService _service;

    public ParkingSessionsController(IParkingSessionService service)
    {
        _service = service;
    }

    /// <summary>Ocupa a próxima vaga disponível com o veículo pendente mais antigo</summary>
    [HttpPost("occupy/{parkingLotId:guid}")]
    public async Task<IActionResult> OccupySpot(Guid parkingLotId)
    {
        var result = await _service.OccupySpotAsync(parkingLotId);
        return StatusCode(result.StatusCode, result);
    }

    /// <summary>Libera vaga, encerra sessão e calcula valor</summary>
    [HttpPost("release/{spotId:guid}")]
    public async Task<IActionResult> ReleaseSpot(Guid spotId)
    {
        var result = await _service.ReleaseSpotAsync(spotId);
        return StatusCode(result.StatusCode, result);
    }

    /// <summary>Lista sessões ativas de um estacionamento</summary>
    [HttpGet("active/{parkingLotId:guid}")]
    public async Task<IActionResult> GetActiveSessions(Guid parkingLotId)
    {
        var result = await _service.GetActiveSessionsAsync(parkingLotId);
        return StatusCode(result.StatusCode, result);
    }

    /// <summary>Busca sessão por ID com detalhes completos</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        return StatusCode(result.StatusCode, result);
    }
}
