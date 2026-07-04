# Markety AI Shopping Assistant

The assistant works in three modes:

- Gemini API when a server-side API key is configured.
- OpenAI when a server-side API key and Responses API endpoint are configured.
- Local Ollama for heavier admin/product/support/review AI on development machines.
- A deterministic local fallback for search, comparison, cart/wishlist planning,
  order tracking, and security guidance when no key is configured or the AI API fails.

Customer storefront chat intentionally does not call Ollama. Local CPU Ollama was
too slow for storefront chat during testing, so when `AiAssistant:Provider` is
`Ollama`, `/api/assistant/chat` immediately uses the deterministic local shopping
assistant. Product/admin/security/support/review AI can still use the shared
Ollama-backed `IGenerativeAiClient`.

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

For local Ollama development, install Ollama, pull a small JSON-capable model,
and configure the backend to use the local generate endpoint:

```powershell
ollama pull qwen2.5:3b
dotnet user-secrets set "AiAssistant:Provider" "Ollama" --project BackEnd/BackEnd.csproj
dotnet user-secrets set "AiAssistant:Model" "qwen2.5:3b" --project BackEnd/BackEnd.csproj
dotnet user-secrets set "AiAssistant:Endpoint" "http://localhost:11434/api/generate" --project BackEnd/BackEnd.csproj
dotnet user-secrets set "AiAssistant:TimeoutSeconds" "120" --project BackEnd/BackEnd.csproj
```

Ollama requests are sent with `stream = false`, JSON format, CPU-only
`num_gpu = 0`, and smaller context/output limits so they avoid local CUDA driver
issues and return more predictably on this machine.
