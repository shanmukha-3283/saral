---
name: bedrock-explain
description: Saral's Bedrock integration — invoke Claude Sonnet with a document image and return the strict JSON contract {summary, what_it_means, actions[{step, deadline}], draft_reply} in Telugu, Hindi, or English. Use when implementing or debugging POST /explain, Bedrock prompts, vision input, or the DynamoDB result schema.
---

# Bedrock Explain (`POST /explain`)

## Verified model IDs in `us-east-1`

- `anthropic.claude-sonnet-4-5-20250929-v1:0` (default)
- `anthropic.claude-sonnet-4-6`
- `anthropic.claude-sonnet-5`

Model access is already granted. Override via `BEDROCK_MODEL_ID` env var.

## Request shape (AWS SDK v3 `@aws-sdk/client-bedrock-runtime`, Converse API)

- Multimodal message: text prompt + image bytes (`{ bytes: <Buffer> }`,
  JPEG/PNG from the upload). Max ~5 MB — downscale client-side if larger.
- Inference: `maxTokens: 2000`, `temperature: 0.2` (factual, stable JSON).
- System prompt must demand **JSON only, no markdown fences**, with exactly:
  `{summary, what_it_means, actions[{step, deadline}], draft_reply}`.
  `deadline` is a plain-language string or `null` (never invent dates —
  use `null` when the document states none).
- `language` param (`te`/`hi`/`en`) selects output language. Telugu and
  Hindi answers in native script. `draft_reply` is always in the SAME
  language the user picked.
- Parse defensively: strip fences if present, `JSON.parse`, validate all
  four keys, retry once with "return valid JSON only" on failure.

## DynamoDB (`saral-results`, on-demand)

Partition key `id` (uuid). Item: `id, createdAt (ISO), language,
summary, what_it_means, actions[], draft_reply, imageKey, modelId`.
`PutItem` on every successful explain; never store raw image bytes in DDB
(only the S3 `imageKey`).

## Env vars (placeholders in `.env.example`, never real values)

```
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-5-20250929-v1:0
RESULTS_TABLE=saral-results
UPLOADS_BUCKET=saral-uploads-<account-id>
```

Local dev uses the `saral-hackathon` profile from `~/.aws`; Lambda gets its
permissions from the SAM execution role (see `sam-deploy`).
