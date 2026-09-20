---
name: sam-deploy
description: Build, validate, test locally, and deploy Saral's AWS SAM stack (Lambda, API Gateway, S3, DynamoDB, S3 static-website hosting) including the podman container workaround. Use when running sam build, sam local, sam deploy, editing template.yaml, or debugging Lambda/API Gateway/S3/DynamoDB issues.
---

# SAM Deploy

Stack: `us-east-1`. Installed: `sam` 1.166.2 (via `uv tool`), `aws` CLI
2.36.49. No sudo on this machine; `docker` is podman emulation.

## Container runtime (REQUIRED for `sam local`)

The podman user socket is active. Export before any `sam local` command:

```bash
export DOCKER_HOST=unix:///run/user/1000/podman/podman.sock
```

If `sam local` still fails, fall back to testing the Hono handler directly
with `tsx` (no container needed) — local-first rule still satisfied.

## Command recipes

```bash
sam build                          # from repo root (template.yaml)
sam validate --lint                # catch template errors early
sam local start-api --port 3001    # local API Gateway; test POST /explain
sam deploy --stack-name saral --region us-east-1 --capabilities CAPABILITY_IAM \
  --resolve-s3 --parameter-overrides "GeminiApiKey=$(sed -n 's/^GEMINI_API_KEY=//p' api/.env)"
```

## template.yaml must-haves

- `Transform: AWS::Serverless-2016-10-31`
- Lambda: Node 22 runtime, `POST /explain` via HttpApi event.
- S3 uploads bucket with lifecycle rule `ExpirationInDays: 1` (24h).
- DynamoDB tables `saral-results` (partition key `id`, on-demand billing)
  and `saral-cache` (partition key `docHash`, TTL on `expiresAt`, 7 days).
  Attach each with a SAM `DynamoDBCrudPolicy` (covers Get/Put/Scan).
- Lambda execution role: least privilege — `s3:PutObject/GetObject`
  (uploads bucket only), `dynamodb:PutItem/GetItem` (results table only).
  No Bedrock policy: the model call goes to Google Gemini over HTTPS;
  the key arrives via the `GeminiApiKey` SAM parameter
  (`sam deploy --parameter-overrides GeminiApiKey=...`).
- CloudFront is BLOCKED on this account (new distributions need account
  verification, like Bedrock). Frontend is served from the S3 `WebBucket`
  static-website endpoint (public-read bucket policy) and calls the API URL
  directly via the `VITE_API_BASE` build var — see README Deploy section.
- Lambda packaging gotcha: `api/package.json` must NOT set `"type": "module"`.
  The Node22 runtime loads handlers via ESM `import()`, which cannot see named
  exports in esbuild's CJS bundle (`module.exports = __toCommonJS(...)`
  defeats cjs-module-lexer → `Runtime.HandlerNotFound`). Keep the bundle
  plain CJS `dist/lambda.js` with `Handler: dist/lambda.handler`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `sam local` → cannot connect to Docker | `export DOCKER_HOST=...` (above); check `systemctl --user status podman.socket` |
| `sam deploy` → requires capabilities | add `--capabilities CAPABILITY_IAM` |
| `sam deploy` → missing parameter | pass `--parameter-overrides GeminiApiKey=...` |
| 403 from API Gateway | check HttpApi route + Lambda resource policy |
| Costs | Lambda/S3/DynamoDB free tiers + Gemini free tier; well under $100 |

Never print or commit credentials. Verify deploys read-only first
(`aws cloudformation describe-stacks`, `aws lambda get-function`).
