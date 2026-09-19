---
name: saral-workflow
description: Saral hackathon build workflow — the 4 Master-Prompt phases (scaffold, Hono API, React frontend, SAM deploy), one-flow-end-to-end-first rule, commit discipline, and local-first testing. Use when starting or continuing any Saral feature, phase, or bugfix.
---

# Saral Workflow

Saral: user uploads a photo of an official document, picks a language
(Telugu/Hindi/English), backend sends the image to Amazon Bedrock and
returns JSON `{summary, what_it_means, actions[{step, deadline}], draft_reply}`.
Each result is saved in DynamoDB. Frontend is mobile-first, big buttons,
one screen, loading state, "read aloud" via the browser Speech API.

## Build phases (STOP after each for the human to test)

1. **Scaffold monorepo** — `web/`, `api/`, `template.yaml` (SAM), README.
2. **Hono API** — `POST /explain`, run locally with a sample image.
3. **React frontend** — connect to the API (Vite proxy in dev).
4. **SAM deploy** — Lambda, API Gateway (HTTP API), S3 (24h lifecycle),
   DynamoDB, CloudFront. See `sam-deploy` skill.

## Rules (from AGENTS.md)

- Get ONE flow working end to end before adding anything else.
- Commit small and often, with clear messages (`git add` only intended files).
- Never hardcode secrets. Use env vars + `.env.example` (see `bedrock-explain`).
- Keep files simple. Explain briefly what changed after each step.
- Every feature runs locally first, then `sam deploy`.
- README must list AWS services used AND disclose AI coding tools used.

## Tooling available in this project

- **aws MCP**: `call_aws` (any AWS API), `search_documentation`,
  `read_documentation` — uses `saral-hackathon` creds in `us-east-1`.
- **context7**: current docs for Hono, React, Tailwind, AWS SDK v3.
- **playwright**: drive the real frontend in a browser (phase 3+).
- **github**: issues/PRs (needs `GITHUB_PERSONAL_ACCESS_TOKEN` exported).
- When unsure about any API, use the `docs-lookup` skill — never guess.
