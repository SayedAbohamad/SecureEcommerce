using BackEnd.Models;
using Microsoft.Extensions.Options;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;

namespace BackEnd.Services
{
    public class RecaptchaService : IRecaptchaService
    {
        private readonly HttpClient _httpClient;
        private readonly RecaptchaSettings _settings;
        private readonly ILogger<RecaptchaService> _logger;
        private static readonly string[] DevTestSecretKeys =
        {
            "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"
        };

        public RecaptchaService(
            HttpClient httpClient,
            IOptions<RecaptchaSettings> settings,
            ILogger<RecaptchaService> logger)
        {
            _httpClient = httpClient;
            _settings = settings.Value;
            _logger = logger;
        }

        private bool IsDevelopmentTestSecret => DevTestSecretKeys.Contains(_settings.SecretKey);

        public async Task<bool> ValidateTokenAsync(string? token, string expectedAction, decimal minimumScore = 0.5m, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                _logger.LogWarning("reCAPTCHA token is missing for action {Action}.", expectedAction);
                return false;
            }

            if (string.IsNullOrWhiteSpace(_settings.SecretKey))
            {
                _logger.LogError("reCAPTCHA secret key is not configured.");
                return false;
            }

            var form = new Dictionary<string, string>
            {
                ["secret"] = _settings.SecretKey,
                ["response"] = token
            };

            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, "https://www.google.com/recaptcha/api/siteverify")
                {
                    Content = new FormUrlEncodedContent(form)
                };

                using var response = await _httpClient.SendAsync(request, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("reCAPTCHA verification returned an invalid HTTP status {StatusCode}.", response.StatusCode);
                    return false;
                }

                var result = await response.Content.ReadFromJsonAsync<RecaptchaVerificationResponse>(cancellationToken: cancellationToken);
                if (result == null)
                {
                    _logger.LogWarning("Unable to parse reCAPTCHA verification response.");
                    return false;
                }

                if (!result.Success)
                {
                    _logger.LogWarning("reCAPTCHA validation failed for action {Action}: {ErrorCodes}.", expectedAction, result.ErrorCodes == null ? "none" : string.Join(",", result.ErrorCodes));
                    return false;
                }

                if (IsDevelopmentTestSecret)
                {
                    _logger.LogInformation("Using test Recaptcha secret; skipping action/score enforcement for dev.");
                    return true;
                }

                if (!string.Equals(result.Action, expectedAction, StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("reCAPTCHA action mismatch. Expected {ExpectedAction}, actual {ActualAction}.", expectedAction, result.Action);
                    return false;
                }

                if (result.Score < minimumScore)
                {
                    _logger.LogWarning("reCAPTCHA score too low for action {Action}. Score: {Score}, Min: {MinimumScore}.", expectedAction, result.Score, minimumScore);
                    return false;
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while validating reCAPTCHA token.");
                return false;
            }
        }

        private sealed class RecaptchaVerificationResponse
        {
            public bool Success { get; set; }
            public decimal Score { get; set; }
            public string? Action { get; set; }
            public string? ChallengeTs { get; set; }
            public string? Hostname { get; set; }
            public string[]? ErrorCodes { get; set; }
        }
    }
}
