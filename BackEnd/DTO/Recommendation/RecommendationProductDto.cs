namespace BackEnd.DTO.Recommendation;

public sealed class RecommendationProductDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal OldPrice { get; set; }
    public string Slug { get; set; } = string.Empty;
    public int Stock { get; set; }
    public Guid CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string? AdditionalImages { get; set; }
    public string? Sizes { get; set; }
    public string Strategy { get; set; } = string.Empty;
    public decimal Score { get; set; }
    public string Explanation { get; set; } = string.Empty;
}
