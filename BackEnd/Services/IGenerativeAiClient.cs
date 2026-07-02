namespace BackEnd.Services;

/// <summary>
/// Thin, provider-agnostic wrapper around the configured generative AI provider
/// (Gemini or OpenAI, see "AiAssistant" configuration section). Shared by every
/// AI-powered admin/customer feature so each feature service does not need to
/// re-implement HTTP, retry, timeout, and response-extraction logic.
///
/// SECURITY: implementations must never log prompts or raw provider responses at
/// a level that could leak user PII, and must never accept caller-supplied API
/// keys or endpoints — those are fixed by server configuration only.
/// </summary>
public interface IGenerativeAiClient
{
    /// <summary>True when a remote provider is configured and enabled. When false,
    /// callers should fall back to a deterministic/local result.</summary>
    bool IsAvailable { get; }

    /// <summary>
    /// Sends a system instruction + user input to the configured provider and asks
    /// for a strict JSON object response (no prose, no markdown fences).
    /// Returns null if the provider is unavailable or the call fails — callers must
    /// have a deterministic fallback and must never surface raw provider errors to
    /// the client.
    /// </summary>
    Task<GenerativeAiResult?> GenerateJsonAsync(
        string systemInstructions,
        string userInput,
        CancellationToken cancellationToken,
        double temperature = 0.3);
}

public sealed class GenerativeAiResult
{
    public required string RawJson { get; init; }
    public required string Provider { get; init; }
}
