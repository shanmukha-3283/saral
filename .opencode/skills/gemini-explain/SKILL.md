---
name: gemini-explain
description: Saral's Gemini integration — call generateContent with a document image and return the strict JSON contract {summary, what_it_means, actions[{step, deadline}], draft_reply} in Telugu, Hindi, or English. Use when implementing or debugging POST /explain, Gemini prompts/vision/JSON mode, or the DynamoDB result schema.
---

# Gemini Explain (`POST /explain`)

Provider: Google Gemini REST API (direct HTTPS from Lambda/local, no SDK).
Model default: `gemini-3.7-flash` (vision + structured JSON; verified live
2026-09-19). Override via `GEMINI_MODEL` env var (`gemini-3.6-flash` also
live but 503-prone under load; `gemini-2.5-flash` retired for new users).
Auth: `x-goog-api-key: <GEMINI_API_KEY>` header.

Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`

## Request shape

```json
{
  "systemInstruction": { "parts": [{ "text": "<saral system prompt>" }] },
  "contents": [{
    "role": "user",
    "parts": [
      { "inline_data": { "mime_type": "image/png|image/jpeg|application/pdf", "data": "<base64>" } },
      { "text": "<instruction incl. output language>" }
    ]
  }],
  "generationConfig": {
    "response_mime_type": "application/json",
    "response_schema": { "type": "OBJECT", "...": "summary/what_it_means/actions[]/draft_reply" },
    "max_output_tokens": 2000,
    "temperature": 0.2
  }
}
```

- Multimodal message: text prompt + file bytes — JPEG/PNG photos or a PDF
  document (`%PDF-` magic → `application/pdf`). Inline data keeps total
  request < 20 MB — our 5 MB cap is fine (and fits the API Gateway body limit).
- `language` param (`te`/`hi`/`en`) selects output language. Telugu and
  Hindi answers in native script. `draft_reply` is always in the SAME
  language the user picked.
- Structured output: `response_schema` enforces exactly
  `{summary, what_it_means, actions[{step, deadline}], draft_reply}`.
  `deadline` is a plain-language string (`""` when the document states
  none — coerced to `null` in code). Never invent dates, names, or
  reference numbers.
- Parse defensively anyway: strip fences if present, `JSON.parse`, validate
  all four keys, retry once with "return valid JSON only" on failure.
- Answer lives at `candidates[0].content.parts[].text` (joined). Non-2xx
  from Google → throw; `app.ts` maps it to 502. Missing `GEMINI_API_KEY`
  → throw (500, fail fast).
- Client timeout 55s (`AbortSignal.timeout`); Lambda `Timeout: 60`.

## DynamoDB (`saral-results`, on-demand)

Partition key `id` (uuid). Item: `id, createdAt (ISO), language,
summary, what_it_means, actions[], draft_reply, imageKey, modelId`.
`PutItem` on every successful explain; never store raw image bytes in DDB
(only the S3 `imageKey`).

## Env vars (placeholders in `.env.example`, never real values)

```
GEMINI_API_KEY=<google-ai-studio-key>
GEMINI_MODEL=gemini-3.7-flash
AWS_REGION=us-east-1
RESULTS_TABLE=saral-results
UPLOADS_BUCKET=saral-uploads-<account-id>
```

Local dev: export `GEMINI_API_KEY` from a `chmod 600` file outside the
repo. Lambda gets it from the SAM `GeminiApiKey` parameter
(`sam deploy --parameter-overrides GeminiApiKey=...`). Free tier: no card
needed (AI Studio key); rate limits per project shown in AI Studio.
