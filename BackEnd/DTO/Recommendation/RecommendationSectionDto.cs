namespace BackEnd.DTO.Recommendation;

public sealed class RecommendationSectionDto
{
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;
    public List<RecommendationProductDto> Items { get; set; } = new();
}
