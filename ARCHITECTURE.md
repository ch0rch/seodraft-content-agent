# ARCHITECTURE.md

A map of how this agent is put together, for humans and AI agents working in the repo. Keep
it current as the codebase evolves.

## Project identification

- **Name:** seodraft for Slack (seodraft content agent)
- **Maintainer:** seodraft
- **License:** Apache-2.0 (forked from Vercel Labs' eve Content Agent Template)
- **Last updated:** 2026-10-05

## Overview

A Slack-based SEO content agent built on the [eve](https://eve.dev) agent framework. People
talk to it in Slack; it works their [seodraft](https://seodraft.app) workspace through the
seodraft MCP server, signed in as each person. seodraft is the system of record and the
authority on the article standard: the agent reads that standard with `get_skill`, writes
through `upsert_post`, is judged by `run_gate`, and approval (`approve_post`) delivers the draft
to the site's git repository. Approved articles are repurposed for LinkedIn, X, and newsletters
with local style skills. The agent runs on Vercel, the same way locally (`eve dev`) and in
production (`eve deploy`).

eve discovers every capability from the filesystem under `agent/`. There is no central
registry or wiring file: a tool's name is its filename, a connection's name is its filename,
and so on.

## Project structure

```text
agent/
  agent.ts                  # model configuration (defineAgent)
  instructions.md           # base system prompt / behavior and job routing
  channels/
    slack.ts                # Slack surface; credentials via Vercel Connect
    eve.ts                  # HTTP API; dev-only shim that presents the TUI as a user
  connections/
    seodraft.ts             # seodraft MCP server, user-scoped OAuth; per-tool approval policy
  sandbox.ts                # sandbox backend (Vercel Sandbox)
  subagents/
    researcher/             # agent.ts + instructions.md; fresh-context web researcher (web tools only)
    reviewer/               # agent.ts + instructions.md + tools/get_surface_rubric.ts + lib/rubric.generated.ts
  tools/
    lint_against_style.ts   # banned-words check against a social surface's skill
    upload_asset.ts         # Vercel Blob: store text/binary
    list_assets.ts          # Vercel Blob: browse
    get_asset_info.ts       # Vercel Blob: metadata
    download_asset.ts       # Vercel Blob: read back (Blob URLs only)
    delete_asset.ts         # Vercel Blob: delete (approval-gated)
    get_writer_preferences.ts   # Blob: load this writer's saved preferences
    save_writer_preferences.ts  # Blob: save standing preferences (principal-scoped)
    clear_writer_preferences.ts # Blob: clear this writer's preferences (approval-gated)
  lib/
    writer-preferences.ts   # principal-scoped Blob key + reserved-prefix guard (shared helper)
    surfaces.generated.ts   # generated shared SURFACES enum (style skill folders are the source of truth)
  skills/
    seo-planning/           # onboarding, profile, evidence bank, topic bank, calendar
    seo-article/            # next_write → brief → body → run_gate → approve_post
    linkedin-style/         # SKILL.md + references/{best-practices.md, post-specs.md, banned-words.json}
    x-style/                # SKILL.md + references/{best-practices.md, post-specs.md, banned-words.json}
    newsletter-style/       # SKILL.md + references/{best-practices.md, email-specs.md, banned-words.json}
shared-references/          # house-wide writing rules (source of truth), synced into each skill
  ai-phrases-to-avoid.md
  plain-english-alternatives.md
scripts/
  sync-shared.mjs           # syncs shared refs into skills; generates SURFACES + reviewer rubric (pnpm sync:shared)
```

## Core components

| Component | Lives in | eve primitive | Responsibility |
| --- | --- | --- | --- |
| Slack surface | `agent/channels/slack.ts` | Channel | Receives @mentions/DMs, threads replies, renders approvals and sign-in prompts |
| Agent runtime | `agent/agent.ts` + `instructions.md` | Agent | The model loop; routes each request to a skill and enforces seodraft's non-negotiables |
| seodraft access | `agent/connections/seodraft.ts` | Connection (MCP) | Every seodraft tool, as the signed-in person; human-act, confirming, and paid calls are approval-gated |
| SEO skills | `agent/skills/seo-planning/`, `agent/skills/seo-article/` | Skill | Order of work in a thread; the editorial standard itself comes from seodraft's `get_skill` |
| Style skills | `agent/skills/<surface>-style/` | Skill | Voice/structure rules for repurposing (LinkedIn, X, newsletter); house-wide rules synced in from `shared-references/` |
| Style lint | `agent/tools/lint_against_style.ts` | Tool | Deterministic banned-words check for social surfaces, reads the skill's `banned-words.json` |
| Asset tools | `agent/tools/{upload,list,get_asset_info,download,delete}_asset.ts` | Tools | Store and manage files (article images, exports) in Vercel Blob |
| Writer preferences | `agent/tools/{get,save,clear}_writer_preferences.ts` + `agent/lib/writer-preferences.ts` | Tools | Per-writer standing preferences for social posts, keyed to the resolved principal (never model input) |
| Researcher subagent | `agent/subagents/researcher/` | Subagent | Fresh-context web research for facts the seodraft brief and evidence bank don't cover; returns cited findings + gaps, never first-hand evidence |
| Reviewer subagent | `agent/subagents/reviewer/` | Subagent | Fresh-context, verdict-only review of a finished social post or newsletter; articles are judged by `run_gate` instead |

Channels and the connection are I/O boundaries. Tools run in the app runtime (full
`process.env`). Skills only add instructions to context; they are not an execution surface. The
`researcher` and `reviewer` subagents each run in their own isolated child session — fresh
context, none of the root's skills or connections — so the root passes what each needs in the call
`message`.

## Data stores

- **seodraft** (external, user-owned): profile, evidence bank, topic bank, calendar, briefs,
  drafts, rules results, and the delivery configuration. The agent never holds a shared seodraft
  credential; it acts as each person via their own OAuth token.
- **The site's git repository** (external): where `approve_post` / `deliver_draft` write the
  approved article as a draft file. seodraft writes it, not the agent.
- **Vercel Blob**: object storage for article images, exports, and attachments. Authenticated by
  the project's OIDC token (no `BLOB_READ_WRITE_TOKEN`). Also holds per-writer style preferences
  under the reserved `writer-preferences/<hashed-principal>.md` prefix, reachable only through
  the principal-scoped preference tools.
- **Vercel Sandbox** (`/workspace/skills/...`): holds the seeded skill files the lint tool and
  model read. Not a durable application data store.

There is no application database.

## External integrations

| Integration | Purpose | Method |
| --- | --- | --- |
| Slack | Chat surface (inbound events + outbound messages) | Vercel Connect connector (`SLACK_CONNECTOR`), webhook trigger at `/eve/v1/slack` |
| seodraft (MCP) | SEO workspace: planning, drafting, rules, approval, delivery | MCP connection at `https://seodraft.app/mcp` with user-scoped OAuth via Vercel Connect (`SEODRAFT_CONNECTOR`, default `seodraft.app/seodraft`) |
| Vercel Blob | File/asset storage | `@vercel/blob`, OIDC-authenticated |
| Vercel AI Gateway | Model access | Gateway model id (`anthropic/claude-opus-4.8`) resolved through the linked project |
| Vercel Sandbox | Isolated runtime that holds seeded skill files | `agent/sandbox.ts` (`vercel()` backend) |

seodraft's OAuth server publishes RFC 8414 / RFC 9728 discovery, dynamic client registration,
client ID metadata documents, PKCE (S256), and refresh tokens, so `vercel connect create
seodraft.app` registers the client without manual setup. It issues user tokens only
(`supportedSubjectTypes: ["user"]`).

## Deployment & infrastructure

- **Platform:** Vercel. Deploy with `eve deploy` (wraps `vercel deploy --prod`); the raw
  `vercel deploy` cannot auto-detect the eve framework.
- **Connectors:** provisioned via the Deploy button or `vercel connect create` + `attach`;
  the Slack trigger must point at `/eve/v1/slack`.
- **Environment:** `SLACK_CONNECTOR` and `SEODRAFT_CONNECTOR` (connector UIDs) in the Vercel
  project; the model and Blob authenticate via the project's OIDC token.
- **Local development:** `pnpm dev` runs the same runtime in a TUI; `vercel env pull`
  supplies a short-lived OIDC token. The Slack surface only runs against a deployment.

## Security considerations

- **Inbound route auth** (`agent/channels/`): the framework default `[localDev(),
  vercelOidc()]` rejects public browser traffic; Slack traffic is authenticated by its
  connector. Slack's `defaultSlackAuth` issues a per-user (`principalType: "user"`)
  principal, which the user-scoped seodraft connection requires.
- **Outbound auth:** seodraft is per-person OAuth via Vercel Connect (token resolved per call,
  never exposed to the model); the sign-in link is delivered privately to the person who
  triggered it. Blob uses the project OIDC token. No API keys live in code, and `.env*` is
  gitignored.
- **Human-in-the-loop:** the seodraft connection's `approval` policy gates the calls that record
  the human's decision or write to git (`approve_post`, `approve_profile`, `deliver_draft`,
  `archive_topic`), the confirming call of the dry-run tools (`archive_post`, `merge_topics`
  with `confirm: true`), and every call that can spend the user's DataForSEO balance.
  Irreversible local tools (`delete_asset`, `clear_writer_preferences`) are gated with `approval`
  from `eve/tools/approval`. Each renders as a Slack approve/deny button.
- **Spend ceilings:** seodraft refuses paid runs that would break its per-run or rolling 24h
  ceiling before spending, independent of the agent.
- **Input hardening:** `lint_against_style` escapes banned words before building a `RegExp`
  (prevents ReDoS) and bounds input length; `download_asset` only fetches
  `*.blob.vercel-storage.com` URLs (prevents SSRF).
- **Per-writer isolation:** writer-preference tools derive their Blob key from the resolved
  principal (`ctx.session.auth.current`), never from model input. The Blob store is provisioned
  public, so preferences are scoped, not strongly confidential — use a private store if that
  matters.

## Development & testing

- **Runtime/TUI:** `pnpm dev` (eve dev TUI; `/model` links a provider).
- **Type checking:** `pnpm typecheck` (tsc).
- **Lint/format:** `pnpm check` / `pnpm fix` (Ultracite, a Biome preset; config in
  `biome.jsonc`).
- **Discovery diagnostics:** `npx eve info` (must report 0 errors / 0 warnings).
- There is no unit-test suite; verify behavior in the dev TUI.

## Future considerations

- **Scheduled writing.** eve schedules run as the app principal, and seodraft issues user tokens
  only, so a cron job cannot call seodraft yet. Options: dispatch the schedule through the Slack
  channel as the user who set it up, or an app-scoped seodraft credential.
- **Vercel Connect catalog.** Submitting seodraft as a Connect service would show it by name and
  icon in the connector picker.

## Glossary

- **eve:** the agent framework powering this app; discovers capabilities from `agent/`.
- **seodraft:** the SEO workspace the agent works in; the system of record and the rules.
- **Channel:** an inbound/outbound surface (here, Slack).
- **Connection:** an external server (MCP/OpenAPI) exposed to the model; tools are found with
  `connection_search` and called with `connection_execute`, and are named
  `<connection>__<tool>` in approval policies and events.
- **Tool:** a typed action authored with `defineTool`, run in the app runtime.
- **Skill:** a load-on-demand Markdown procedure; the packaged form requires `description`
  frontmatter used for routing.
- **Subagent:** a declared agent under `agent/subagents/<id>/` that the root delegates to as a
  tool. It runs in its own fresh child session and inherits none of the root's skills,
  connections, or tools.
- **Surface:** a repurposing content type with its own style skill (LinkedIn, X, newsletter).
- **Shared references:** house-wide writing rules in `shared-references/` (the source of
  truth), copied into every skill by `scripts/sync-shared.mjs`.
- **Vercel Connect:** brokers OAuth/credentials for Slack and seodraft; connectors are
  identified by a UID.
- **OIDC:** the project's Vercel identity token, used to authenticate Blob (and AI Gateway)
  without static keys.
