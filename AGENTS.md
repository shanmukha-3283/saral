# Saral — explains official documents in regional languages
Stack: React+Vite+Tailwind, Hono (TypeScript) on AWS Lambda, AWS SAM,
S3, DynamoDB, Amazon Bedrock. Hackathon: Bharat Builds Tour, 1 day left.

## Rules
- Get ONE flow working end to end before adding anything else.
- Commit small and often, with clear messages.
- Never hardcode secrets. Use env vars and .env.example.
- Keep files simple. Explain briefly what you changed after each step.
- Every feature must run locally first, then deploy with `sam deploy`.
- README must list AWS services used and disclose AI coding tools used.

## Environment (verified 2026-09-19)
- Region `us-east-1`, IAM user `saral-hackathon`, Bedrock Claude Sonnet access granted.
- Tools: `uv` 0.12.17, `aws` CLI 2.36.49, `sam` 1.166.2. `docker` is podman
  emulation; `sam local` needs `DOCKER_HOST=unix:///run/user/1000/podman/podman.sock`.
- MCP servers (`opencode.json`): `aws` (managed AWS MCP via proxy),
  `context7` (current lib docs), `playwright` (UI tests), `github`
  (needs `GITHUB_PERSONAL_ACCESS_TOKEN` exported before launching opencode).

## Skills (`.opencode/skills/*/SKILL.md`, auto-loaded)
- `saral-workflow` — the 4 build phases; stop after each for human test.
- `sam-deploy` — SAM build/local/deploy recipes + troubleshooting.
- `bedrock-explain` — POST /explain contract, model IDs, DynamoDB schema.
- `docs-lookup` — use AWS MCP + Context7 instead of guessing APIs.
