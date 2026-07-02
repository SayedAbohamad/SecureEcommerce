namespace BackEnd.DTO.Recommendation;

public sealed class RecommendationRequestDto
{
    public string Placement { get; set; } = "home";
    public Guid? ProductId { get; set; }
    public int Limit { get; set; } = 8;
    public string? SessionId { get; set; }
}
