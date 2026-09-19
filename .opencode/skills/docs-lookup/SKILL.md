---
name: docs-lookup
description: Look up current AWS, Hono, React, Tailwind, and AWS SDK documentation through the AWS MCP server and Context7 instead of guessing APIs. Use when unsure about any AWS service API, CloudFormation/SAM property, Hono handler pattern, React hook, or SDK v3 client usage.
---

# Docs Lookup (never guess APIs)

This project has two live documentation sources — use them BEFORE writing
code that touches an unfamiliar API.

## AWS (services, SAM/CloudFormation, IAM, Bedrock)

Use the **aws MCP** tools:
- `search_documentation` — find the right page (e.g. "SAM HttpApi CORS",
  "Bedrock Converse API image input", "DynamoDB on-demand billing").
- `read_documentation` — read the exact page for property names and shapes.
- `call_aws` — read-only verification (`describe-stacks`, `get-function`,
  `list-foundation-models`). Mutating calls need human confirmation.

## Frameworks (Hono, React, Tailwind, AWS SDK for JS v3)

Use **context7**:
1. `resolve-library-id` with the library name (known-good IDs:
   Hono → `/websites/hono_dev`).
2. `query-docs` with the library ID + a specific question
   (e.g. "Hono CORS middleware for Lambda", "AWS SDK v3 BedrockRuntime
   ConverseCommand with image bytes").

## Rules

- Training-data memory of APIs is stale (Hono v4, SDK v3, SAM properties
  all drift). One docs call beats ten debug cycles.
- Quote the doc findings briefly in your summary so the human can trust
  the choice.
- If docs and local behavior disagree, trust local execution output.
