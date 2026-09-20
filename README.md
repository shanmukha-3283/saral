# Saral — official documents, explained in your language

Upload a photo or PDF of an official document, pick Telugu / Hindi / English /
Marathi / Tamil, and get back a simple explanation: what it says, what it
means for you, what to do next (with deadlines), plus a ready-to-send draft
reply. Results are saved (and cached) for later. Mobile-first, one screen,
with read-aloud and a previous-explanations panel.

## Try it (live)

- App: <http://saral-webbucket-2yeu2um8fl9y.s3-website-us-east-1.amazonaws.com>
- API health: <https://5kp0hzndc2.execute-api.us-east-1.amazonaws.com/health>
- Sample test document: `api/test/scheme-notice.png` (PNG) or
  `api/test/scheme-notice.pdf` (PDF).

## Stack

- Frontend: React + Vite + Tailwind + shadcn/ui (`web/`)
- Backend: Hono (TypeScript) on AWS Lambda (`api/`)
- Infra (AWS SAM, `template.yaml`): API Gateway (HTTP API), Lambda, S3
  (uploads with 24h lifecycle + static-website hosting), DynamoDB
  (`saral-results` + `saral-cache` with 7-day TTL)
- Model: Google Gemini (`gemini-3.7-flash` first, automatic failover to
  `gemini-3.6-flash` / `gemini-3.8-flash` on 503/429; vision + structured
  JSON via direct REST; free AI Studio key in `GEMINI_API_KEY`)

## Architecture

```mermaid
flowchart LR
    U[Phone browser] -->|static site| W[S3 WebBucket]
    U -->|POST /explain, GET /results| A[API Gateway HTTP API]
    A --> L[Lambda: Hono app]
    L -->|cache check / write| C[(DynamoDB saral-cache\n7-day TTL)]
    L -->|failover 3.7 → 3.6 → 3.8| G[Google Gemini\nvision + JSON mode]
    L -->|PutItem result| R[(DynamoDB saral-results)]
    L -->|PutObject| S[S3 UploadsBucket\n24h lifecycle]
```

## Demo script (60 seconds)

1. Open the app, upload `api/test/scheme-notice.png`.
2. Pick **Telugu**, hit **Explain my document** — summary, deadlines,
   draft reply appear (note the model in the response if you curl it).
3. Hit **Explain again** in **Marathi** — repeat uploads are served
   instantly from the saved result (`cached: true`).
4. Scroll to **Previous explanations** — every result persists in DynamoDB
   and re-opens in one tap.

## Run locally

```bash
# API (http://localhost:3001/health) — needs GEMINI_API_KEY, see .env.example
cd api && npm install && set -a && source .env && set +a && npm run dev

# Web (http://localhost:5173, /api/* proxied to :3001)
cd web && npm install && npm run dev
```

`sam local` needs the podman socket first:
`export DOCKER_HOST=unix:///run/user/1000/podman/podman.sock`

## Live deployment (us-east-1, stack `saral`)

- App: http://saral-webbucket-2yeu2um8fl9y.s3-website-us-east-1.amazonaws.com
- API: https://5kp0hzndc2.execute-api.us-east-1.amazonaws.com (`/health`, `/explain`)

## Deploy

```bash
cd api && npm install && npm run build   # produces dist/lambda.js (CJS)
sam build && sam deploy --stack-name saral --region us-east-1 \
  --capabilities CAPABILITY_IAM --resolve-s3 \
  --parameter-overrides "GeminiApiKey=$(sed -n 's/^GEMINI_API_KEY=//p' api/.env)"

# frontend (points the built app at the deployed API, then publishes to S3)
cd web && VITE_API_BASE="$(aws cloudformation describe-stacks --region us-east-1 \
  --stack-name saral --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text | sed 's#/$##')" npm run build
aws s3 sync web/dist "s3://$(aws cloudformation describe-stacks --region us-east-1 \
  --stack-name saral --query 'Stacks[0].Outputs[?OutputKey==`WebBucketName`].OutputValue' \
  --output text)" --delete
```

Notes:

- CloudFront is **not** used: this AWS account is not verified for new
  CloudFront resources (same account-level block as Bedrock), so the frontend
  is served from an S3 static-website bucket and calls the API URL directly
  via the `VITE_API_BASE` build var. `/api/*` aliases in `api/src/app.ts`
  are kept for a future CloudFront `/api/*` behavior.
- Lambda packaging gotchas: `api/package.json` must **not** set
  `"type": "module"` (the Node22 runtime loads handlers via ESM `import()`,
  which cannot see named exports in esbuild's CJS output); the bundle stays
  plain CJS `dist/lambda.js` with `Handler: dist/lambda.handler`.
- `samconfig.toml` is git-ignored (it would store the Gemini key from
  `--parameter-overrides`). Delete/recreate the throwaway `saral-results`
  table if a stale one exists before first deploy.

## AWS services used

API Gateway (HTTP API) · AWS Lambda (Node 22) · Amazon S3 (uploads with 24h
lifecycle + static-website hosting) · Amazon DynamoDB · AWS CloudFormation
(via SAM) · Google Gemini (AI Studio API, `generateContent` vision + JSON
mode — Bedrock runtime was account-blocked, see AGENTS.md; CloudFront also
blocked: new CloudFront resources require account verification)

## AI coding tools used

Built with AI assistance: opencode (Meta Muse Spark) for scaffolding, code,
and docs; AWS MCP Server + Context7 MCP for live AWS/framework docs.
Model provider is Google Gemini (free tier); no AWS Bedrock calls.
