namespace BackEnd.DTO.Admin;

public sealed class AdminInsightsDto
{
    public required string Summary { get; set; }
    public List<string> SuggestedActions { get; set; } = new();
    public List<AdminInsightMetricDto> Metrics { get; set; } = new();
    public string Provider { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

public sealed class AdminInsightMetricDto
{
    public required string Label { get; set; }
    public required string Value { get; set; }
}

public sealed class SecurityInsightsDto
{
    public required string Summary { get; set; }
    public required string RiskLevel { get; set; }
    public string RecommendedAction { get; set; } = string.Empty;
    public List<SecurityRiskSignalDto> Signals { get; set; } = new();
    public string Provider { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

public sealed class SecurityRiskSignalDto
{
    public required string Title { get; set; }
    public required string Severity { get; set; }
    public required string Description { get; set; }
}
