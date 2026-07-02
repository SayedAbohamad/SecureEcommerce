namespace BackEnd.DTO.Review;

public sealed class ReviewSummaryDto
{
    public Guid ProductId { get; set; }
    public bool Available { get; set; }
    public string OverallSentiment { get; set; } = "neutral"; // positive | mixed | negative | neutral
    public List<string> Positives { get; set; } = new();
    public List<string> Negatives { get; set; } = new();
    public List<string> CommonThemes { get; set; } = new();
    public string GoodFor { get; set; } = string.Empty;
    public int ReviewCountAtGeneration { get; set; }
    public double AverageRatingAtGeneration { get; set; }
    public DateTime? GeneratedAt { get; set; }
    public string Provider { get; set; } = "local";

    /// <summary>True when the underlying review set has changed since this summary
    /// was generated (new reviews added/removed), so the UI can offer a refresh.</summary>
    public bool Stale { get; set; }
}
