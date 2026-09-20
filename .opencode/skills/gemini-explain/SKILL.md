---
name: gemini-explain
description: Saral's Gemini integration — call generateContent with a document image and return the strict JSON contract {summary, what_it_means, actions[{step, deadline}], draft_reply} in Telugu, Hindi, or English. Use when implementing or debugging POST /explain, Gemini prompts/vision/JSON mode, or the DynamoDB result schema.
---

# Gemini Explain (`POST /explain`)

Provider: Google Gemini REST API (direct HTTPS from Lambda/local, no SDK).
Model default: failover list `gemini-3.7-flash,gemini-3.6-flash,gemini-3.8-flash`
(first healthy model on 503/429 wins; override via `GEMINI_MODEL` env —
single id or comma list; `gemini-2.5-flash` retired for new users).
Response header carries the winning model in `modelId`; repeat
document+language replays from `saral-cache` (`cached: true`, 7-day TTL).
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
- `language` param (`te`/`hi`/`en`/`mr`/`ta`) selects output language. Answers
  in native script. `draft_reply` is always in the SAME
  language the user picked.
- Structured output: `response_schema` enforces exactly
  `{summary, what_it_means, actions[{step, deadline}], draft_reply}`.
  `deadline` is a plain-language string (`""` when the document states
  none — coerced to `null` in code). Never invent dates, names, or
  reference numbers.
- Parse defensively anyway: strip fences if present, `JSON.parse`, validate
  all four keys; a malformed answer gets one strict-JSON retry per model, then
  failover moves to the next model.
- Answer lives at `candidates[0].content.parts[].text` (joined). Non-2xx
  from Google → throw; `app.ts` maps it to 502. Missing `GEMINI_API_KEY`
  → throw (500, fail fast).
- Client timeout 20s per attempt (`AbortSignal.timeout`); failover budget
  22s + one 3s-paused second pass, inside the ~30s API Gateway ceiling.
  Lambda `Timeout: 60`.

## DynamoDB (`saral-results`, on-demand)

Partition key `id` (uuid). Item: `id, createdAt (ISO), language,
summary, what_it_means, actions[], draft_reply, imageKey, modelId, cached`.
`PutItem` on every fresh explain; document bytes go to the uploads S3
bucket (`PutObject <id>.<png|jpg|pdf>`, 24h lifecycle), never to DDB.

## Cache (`saral-cache`, on-demand, 7-day TTL on `expiresAt`)

Partition key `docHash` = sha256(`language:base64(doc)`). `GetItem` before
any model call; hit returns the stored row with `cached: true` (~1s).
Writes are best-effort (a miss just means "call the model"). Local dev
without the table degrades to always-fresh. Managed by the same SAM
`DynamoDBCrudPolicy` pattern; frontend chips it as "Served instantly from
saved result".

## History (`GET /results`, `GET /results/:id`)

- `GET /results` → `{items}` (recent 20, Scan+sort; serves the
  "Previous explanations" panel).
- `GET /results/:id` → the item or 404.
- Both registered at `/…` and `/api/…` paths in `app.ts` + `template.yaml`.

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
