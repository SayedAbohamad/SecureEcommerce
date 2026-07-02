using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTO.Product;

public sealed class GenerateProductContentRequestDto
{
    [Required]
    [StringLength(200, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(100)]
    public string? CategoryName { get; set; }

    [Range(0, 100000000)]
    public decimal? Price { get; set; }

    /// <summary>Free-text specs/features/keywords the admin types in, e.g.
    /// "16GB RAM, RTX 4060, 15.6 inch, lightweight". Treated as data, never instructions.</summary>
    [StringLength(1000)]
    public string? Specs { get; set; }

    /// <summary>If provided, the AI improves this text instead of generating from scratch.</summary>
    [StringLength(3000)]
    public string? ExistingDescription { get; set; }
}

public sealed class GeneratedProductContentDto
{
    public string Description { get; set; } = string.Empty;
    public string ShortSeoDescription { get; set; } = string.Empty;
    public List<string> Highlights { get; set; } = new();
    public List<string> SuggestedTags { get; set; } = new();
    public List<GeneratedSpecDto> Specifications { get; set; } = new();
    public string Provider { get; set; } = "local";
}

public sealed class GeneratedSpecDto
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}
