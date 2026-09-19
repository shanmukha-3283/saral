# Saral — official documents, explained in your language

Upload a photo of an official document, pick Telugu / Hindi / English, and get
back a simple explanation: what it says, what it means for you, what to do
next (with deadlines), plus a ready-to-send draft reply. Results are saved
for later. Mobile-first, one screen, with read-aloud.

## Stack

- Frontend: React + Vite + Tailwind (`web/`)
- Backend: Hono (TypeScript) on AWS Lambda (`api/`)
- Infra (AWS SAM, `template.yaml`): API Gateway (HTTP API), Lambda, S3
  (uploads, 24h lifecycle), DynamoDB (`saral-results`)
- Model: Google Gemini (`gemini-3.6-flash`, vision + structured JSON via
  direct REST; free AI Studio key in `GEMINI_API_KEY`)

## Run locally

```bash
# API (http://localhost:3001/health)
cd api && npm install && npm run dev

# Web (http://localhost:5173, /api/* proxied to :3001)
cd web && npm install && npm run dev
```

`sam local` needs the podman socket first:
`export DOCKER_HOST=unix:///run/user/1000/podman/podman.sock`

## Deploy

```bash
cd api && npm install && npm run build   # produces dist/lambda.js
sam build && sam deploy --guided --region us-east-1 --stack-name saral \
  --capabilities CAPABILITY_IAM
```

## AWS services used

API Gateway (HTTP API) · AWS Lambda (Node 22) · Amazon S3 · Amazon DynamoDB ·
AWS CloudFormation (via SAM) · Amazon CloudFront (phase 4) · Google Gemini
(AI Studio API, `generateContent` vision + JSON mode — Bedrock runtime was
account-blocked, see AGENTS.md)

## AI coding tools used

Built with AI assistance: opencode (Meta Muse Spark) for scaffolding, code,
and docs; AWS MCP Server + Context7 MCP for live AWS/framework docs.
Model provider is Google Gemini (free tier); no AWS Bedrock calls.
