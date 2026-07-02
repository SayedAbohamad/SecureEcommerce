# Markety AI Features

## Architecture

All newer AI features use `IGenerativeAiClient` and `GenerativeAiClient` in `BackEnd/Services`. This keeps provider-specific Gemini/OpenAI HTTP logic, API keys, timeout behavior, and JSON extraction in one place. Feature services send a system instruction plus sanitized business input and require strict JSON responses.

Every feature has a deterministic local fallback. If the provider is disabled, the API key is missing, the call fails, or JSON is malformed, the endpoint returns a local result instead of throwing a 500 or exposing provider errors.

## Endpoints and Auth

- `POST /api/AiAssistant/chat` - authenticated customer shopping assistant.
- `GET /api/Recommendation/homepage` and related recommendation endpoints - customer/catalog recommendation engine.
- `GET /api/Review/product/{productId}/summary` - public review summary.
- `POST /api/Review/product/{productId}/summary/refresh` - `Admin` only.
- `POST /api/Product/ai/generate-content` - `Admin` only, rate-limited with `ai`.
- `POST /api/Support/{id}/ai/summarize` - `Admin,Manager`, rate-limited with `ai`.
- `POST /api/Support/{id}/ai/suggest-reply` - `Admin,Manager`, rate-limited with `ai`; returns text only and never sends email.
- `POST /api/Support/{id}/ai/classify` - `Admin,Manager`, rate-limited with `ai`.
- `GET /api/admin/insights` - `Admin`, rate-limited with `ai`.
- `GET /api/admin/security-insights` - `Admin`, rate-limited with `ai`.

## Prompt-Injection Protections

System prompts explicitly label customer/admin text as untrusted data and instruct the model not to follow commands inside reviews, tickets, product fields, or metrics. Services request strict JSON only, validate parsed fields against allowlists, cap string and list lengths, and fall back locally when parsing fails. Prompts and raw AI responses are not logged.

## Privacy

Review summaries send recent rating/comment text for one product. Product content generation sends product listing fields supplied by an admin. Support ticket AI sends the selected ticket subject/message and optional admin context. Admin analytics sends aggregated revenue, product, category, stock, and promo metrics only, never raw per-user rows. Security insights sends deterministic rule signals with masked user IDs. Payment cards, secrets, JWTs, raw user tables, and full customer datasets are never sent.

## Gemini Configuration

Set `AiAssistant:ApiKey` via User Secrets for local development:

```powershell
dotnet user-secrets set "AiAssistant:ApiKey" "your-gemini-api-key" --project BackEnd/BackEnd.csproj
```

Use `AiAssistant__ApiKey` in production. If unset, AI features continue with local fallbacks.

## Graduation Defense Demo Script

1. Show the shopping assistant answering a catalog question.
2. Open the homepage/shop and point out personalized recommendation sections.
3. Open a product detail page and show the review summary card.
4. In admin products, generate product description/SEO/highlights/specs and explain that nothing is saved until the admin applies it.
5. In support inbox, select a ticket, summarize it, classify it, and generate an editable reply draft.
6. In admin dashboard, refresh AI Insights and discuss sales/category/stock/promo actions.
7. Refresh Security AI Insights and explain rule-first detection, masked identifiers, human review, and no automatic bans.

## Manual Testing Checklist

- Disable or remove `AiAssistant:ApiKey`; verify all seven AI features still return fallback output.
- Add a prompt-injection phrase to a review, ticket, or product description; verify the output treats it as data.
- Verify support AI endpoints reject customers/anonymous users and allow Admin/Manager.
- Verify admin insights and security insights reject non-admin users.
- Verify support reply drafts appear in the textarea and are not sent until the admin clicks send.
- Verify dashboard panels show loading, error, generated timestamp, provider, and refresh behavior.

## Known Limitations

Failed login counts and rapid account-change events are not fully modeled in the current database, so security insights use available payment, order, promo, and support-ticket signals. Adding audit/event tables would make those rules stronger. Analytics are generated on demand and not cached; add caching if dashboard traffic grows.
