using BackEnd.DTO.Admin;

namespace BackEnd.Services;

public interface IAdminInsightsService
{
    Task<AdminInsightsDto> GenerateAsync(CancellationToken cancellationToken);
}
