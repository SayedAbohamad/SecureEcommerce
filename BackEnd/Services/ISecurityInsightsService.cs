using BackEnd.DTO.Admin;

namespace BackEnd.Services;

public interface ISecurityInsightsService
{
    Task<SecurityInsightsDto> GenerateAsync(CancellationToken cancellationToken);
}
