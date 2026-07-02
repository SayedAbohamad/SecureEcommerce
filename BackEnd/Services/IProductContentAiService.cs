using BackEnd.DTO.Product;

namespace BackEnd.Services;

public interface IProductContentAiService
{
    /// <summary>Admin-only, preview-only content generation/improvement. The caller
    /// (controller) must never auto-save the result onto the product.</summary>
    Task<GeneratedProductContentDto> GenerateAsync(
        GenerateProductContentRequestDto request,
        CancellationToken cancellationToken);
}
