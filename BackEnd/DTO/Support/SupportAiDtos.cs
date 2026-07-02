using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTO.Support;

public sealed class SupportTicketAiResultDto
{
    public required string Summary { get; set; }
    public required string SuggestedReply { get; set; }
    public required string Priority { get; set; }
    public required string Sentiment { get; set; }
    public required string Category { get; set; }
    public string Provider { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

public sealed class SupportTicketSummaryDto
{
    public required string Summary { get; set; }
    public string Provider { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

public sealed class SupportTicketReplyDraftDto
{
    public required string SuggestedReply { get; set; }
    public string Provider { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

public sealed class SupportTicketClassificationDto
{
    public required string Priority { get; set; }
    public required string Sentiment { get; set; }
    public required string Category { get; set; }
    public string Provider { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

public sealed class SupportTicketAiTextRequestDto
{
    [MaxLength(4000)]
    public string? AdditionalContext { get; set; }
}
