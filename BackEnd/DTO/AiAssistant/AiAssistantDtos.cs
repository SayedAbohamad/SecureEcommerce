using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTO.AiAssistant;

public sealed class AiAssistantRequestDto
{
    [Required]
    [StringLength(1000, MinimumLength = 1)]
    public string Message { get; set; } = string.Empty;

    [MaxLength(12)]
    public List<AiConversationMessageDto> Conversation { get; set; } = new();
}

public sealed class AiConversationMessageDto
{
    [Required]
    [RegularExpression("^(user|assistant)$")]
    public string Role { get; set; } = "user";

    [Required]
    [StringLength(1500, MinimumLength = 1)]
    public string Content { get; set; } = string.Empty;
}

public sealed class AiAssistantResponseDto
{
    public string Reply { get; set; } = string.Empty;
    public string Intent { get; set; } = "general";
    public string Provider { get; set; } = "local";
    public List<AiProductDto> Products { get; set; } = new();
    public List<AiProductDto> Comparison { get; set; } = new();
    public List<AiOrderDto> Orders { get; set; } = new();
    public AiAssistantActionDto? Action { get; set; }
}

public sealed class AiProductDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public List<string> Sizes { get; set; } = new();
}

public sealed class AiOrderDto
{
    public Guid Id { get; set; }
    public DateTime OrderDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public int ItemsCount { get; set; }
}

public sealed class AiAssistantActionDto
{
    public string Type { get; set; } = "none";
    public Guid? ProductId { get; set; }
    public int Quantity { get; set; } = 1;
    public string? Size { get; set; }
    public string Label { get; set; } = string.Empty;
    public bool RequiresConfirmation { get; set; }
}
