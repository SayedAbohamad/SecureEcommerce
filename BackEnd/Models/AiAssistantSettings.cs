namespace BackEnd.Models;

public sealed class AiAssistantSettings
{
    public bool Enabled { get; set; } = true;
    public string Provider { get; set; } = "Gemini";
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "gemini-2.5-flash-lite";
    public string Endpoint { get; set; } = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";
    public int TimeoutSeconds { get; set; } = 30;
}
