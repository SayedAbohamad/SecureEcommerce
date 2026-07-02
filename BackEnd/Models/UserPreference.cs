namespace BackEnd.Models;

public class UserPreference : BaseEntity
{
    public string UserId { get; set; } = string.Empty;
    public ApplicationUser? User { get; set; }

    public Guid CategoryId { get; set; }
    public Category? Category { get; set; }

    public decimal Score { get; set; }
    public DateTime LastInteractionAt { get; set; } = DateTime.UtcNow;
}
