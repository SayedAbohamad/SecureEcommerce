namespace BackEnd.DTO.Recommendation;

public sealed class RecommendationPageResponseDto
{
    public bool Enabled { get; set; }
    public string Placement { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public List<RecommendationSectionDto> Sections { get; set; } = new();
    public string? Message { get; set; }
}
