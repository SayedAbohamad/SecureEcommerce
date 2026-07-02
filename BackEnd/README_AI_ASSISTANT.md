# Markety AI Shopping Assistant

The assistant works in two modes:

- Gemini API when a server-side API key is configured.
- A deterministic local fallback for search, comparison, cart/wishlist planning,
  order tracking, and security guidance when no key is configured or the AI API fails.

Never add an API key to `appsettings.json` or frontend environment files.

Configure the development key with .NET User Secrets:

```powershell
dotnet user-secrets init --project BackEnd/BackEnd.csproj
dotnet user-secrets set "AiAssistant:Provider" "Gemini" --project BackEnd/BackEnd.csproj
dotnet user-secrets set "AiAssistant:ApiKey" "YOUR_GEMINI_API_KEY" --project BackEnd/BackEnd.csproj
```

Or configure production environment variables:

```powershell
$env:AiAssistant__Provider="Gemini"
$env:AiAssistant__ApiKey="YOUR_GEMINI_API_KEY"
```

The standard `GEMINI_API_KEY` environment variable is also supported when
`AiAssistant:ApiKey` is not set.

The model defaults to `gemini-2.5-flash-lite` and can be changed with
`AiAssistant__Model`. Requests use `store: false`, structured JSON output,
server-side catalog/order grounding, rate limiting, and allowlisted actions.

OpenAI is still supported if you switch the provider and endpoint:

```powershell
dotnet user-secrets set "AiAssistant:Provider" "OpenAI" --project BackEnd/BackEnd.csproj
dotnet user-secrets set "AiAssistant:Endpoint" "https://api.openai.com/v1/responses" --project BackEnd/BackEnd.csproj
dotnet user-secrets set "AiAssistant:Model" "gpt-5.5" --project BackEnd/BackEnd.csproj
dotnet user-secrets set "AiAssistant:ApiKey" "YOUR_OPENAI_API_KEY" --project BackEnd/BackEnd.csproj
```
