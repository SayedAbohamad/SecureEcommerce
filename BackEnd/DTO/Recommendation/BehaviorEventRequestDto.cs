using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTO.Recommendation;

public sealed class BehaviorEventRequestDto
{
    [Required]
    [StringLength(40)]
    public string EventType { get; set; } = string.Empty;

    public Guid? ProductId { get; set; }

    [StringLength(300)]
    public string? SearchQuery { get; set; }

    [Range(1, 100)]
    public int? Quantity { get; set; }

    [StringLength(80)]
    public string? Source { get; set; }

    [StringLength(120)]
    public string? SessionId { get; set; }

    public Dictionary<string, string>? Metadata { get; set; }
}
