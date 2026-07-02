namespace BackEnd.Models;

public class UserBehaviorEvent : BaseEntity
{
    public string? UserId { get; set; }
    public ApplicationUser? User { get; set; }

    public string? SessionId { get; set; }

    public Guid? ProductId { get; set; }
    public Product? Product { get; set; }

    public Guid? CategoryId { get; set; }
    public Category? Category { get; set; }

    public string EventType { get; set; } = string.Empty;
    public string? SearchQuery { get; set; }
    public int? Quantity { get; set; }
    public string? Source { get; set; }
    public string? MetadataJson { get; set; }
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}
