namespace BackEnd.Services;

public interface IAiSafetyService
{
    string GetSystemSafetyAddendum();
    string SanitizeInput(string? value, int maxLength);
    string SanitizeOutput(string? value, int maxLength);
    AiSafetyAssessment Assess(string? value);
}

public sealed class AiSafetyAssessment
{
    public bool HasPromptInjection { get; init; }
    public bool RequestsPrivilegedAccountAction { get; init; }
    public bool ContainsSensitiveData { get; init; }
    public bool ShouldBlockProviderCall => HasPromptInjection || RequestsPrivilegedAccountAction;
}
