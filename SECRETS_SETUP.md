# Markety Secrets Setup

`BackEnd/appsettings.json` and `BackEnd/appsettings.Development.json` keep only non-secret structure. Real local values belong in .NET User Secrets. Production should provide the same keys through environment variables or the hosting provider's secret manager.

Run these from the repository root:

```powershell
dotnet user-secrets set "Jwt:Key" "replace-with-at-least-32-random-characters" --project BackEnd/BackEnd.csproj
dotnet user-secrets set "EmailSettings:EmailUsername" "your-smtp-username" --project BackEnd/BackEnd.csproj
dotnet user-secrets set "EmailSettings:EmailPassword" "your-smtp-app-password" --project BackEnd/BackEnd.csproj
dotnet user-secrets set "Stripe:SecretKey" "your-stripe-secret-key" --project BackEnd/BackEnd.csproj
dotnet user-secrets set "Recaptcha:SiteKey" "your-recaptcha-site-key" --project BackEnd/BackEnd.csproj
dotnet user-secrets set "Recaptcha:SecretKey" "your-recaptcha-secret-key" --project BackEnd/BackEnd.csproj
dotnet user-secrets set "AiAssistant:ApiKey" "your-gemini-api-key" --project BackEnd/BackEnd.csproj
```

Production environment variable names use double underscores:

```powershell
Jwt__Key
EmailSettings__EmailUsername
EmailSettings__EmailPassword
Stripe__SecretKey
Recaptcha__SiteKey
Recaptcha__SecretKey
AiAssistant__ApiKey
```

Important rotation note: `git log --all -- BackEnd/appsettings.json` shows `BackEnd/appsettings.json` existed in previous commits. The Gmail app password, JWT signing key, Stripe secret key, and reCAPTCHA secret that were present in this file must be considered exposed and rotated.
