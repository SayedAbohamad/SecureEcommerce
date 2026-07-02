namespace BackEnd.Services.Recommendations;

public sealed class RecommendationSettings
{
    public bool Enabled { get; set; } = true;
    public int DefaultLimit { get; set; } = 8;
    public int CacheMinutes { get; set; } = 5;
    public int TrendingDays { get; set; } = 14;
    public int RecentBehaviorDays { get; set; } = 45;
    public int MaxEventsPerUserContext { get; set; } = 300;
}
