---
name: sam-deploy
description: Build, validate, test locally, and deploy Saral's AWS SAM stack (Lambda, API Gateway, S3, DynamoDB, CloudFront) including the podman container workaround. Use when running sam build, sam local, sam deploy, editing template.yaml, or debugging Lambda/API Gateway/S3/DynamoDB/CloudFront issues.
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
sam deploy --guided --region us-east-1 --stack-name saral \
  --capabilities CAPABILITY_IAM    # first deploy; saves samconfig.toml
sam deploy                         # later deploys reuse samconfig.toml
```

## template.yaml must-haves

- `Transform: AWS::Serverless-2016-10-31`
- Lambda: Node 22 runtime, `POST /explain` via HttpApi event.
- S3 uploads bucket with lifecycle rule `ExpirationInDays: 1` (24h).
- DynamoDB table `saral-results` (partition key `id`, on-demand billing).
- Lambda execution role: least privilege — `bedrock:InvokeModel` (scoped to
  the chosen model ARN), `s3:PutObject/GetObject` (uploads bucket only),
  `dynamodb:PutItem/GetItem` (results table only).
- CloudFront distribution in front of `web/` build output (S3 origin).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `sam local` → cannot connect to Docker | `export DOCKER_HOST=...` (above); check `systemctl --user status podman.socket` |
| `sam deploy` → requires capabilities | add `--capabilities CAPABILITY_IAM` |
| `sam deploy` → Bedrock AccessDenied | model access not granted in `us-east-1`; Bedrock console → Model access |
| 403 from API Gateway | check HttpApi route + Lambda resource policy |
| Costs | Lambda/S3/DynamoDB free tiers + pennies of Bedrock; well under $100 |

Never print or commit credentials. Verify deploys read-only first
(`aws cloudformation describe-stacks`, `aws lambda get-function`).
