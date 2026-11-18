# ARCHITECTURE.md

A map of how this agent is put together, for humans and AI agents working in the repo. Keep
it current as the codebase evolves.

## Project identification

- **Name:** seodraft for Slack (seodraft content agent)
- **Maintainer:** seodraft
- **License:** Apache-2.0 (forked from Vercel Labs' eve Content Agent Template)
- **Last updated:** 2026-11-18 (eve 1.0.2)

## Overview

A Slack-based SEO content agent built on the [eve](https://eve.dev) 1.0 agent framework. People
talk to it in Slack; it works their [seodraft](https://seodraft.app) workspace through the
seodraft MCP server, signed in as each person. seodraft is the system of record and the
authority on the article standard: the agent reads that standard with `get_skill`, writes
through `upsert_post`, is judged by `run_gate`, and approval (`approve_post`) delivers the draft
to the site's git repository or Sanity dataset. The site audit and content map decide what to
write. Approved articles are repurposed for LinkedIn, X, and newsletters with local style skills.
The agent runs in the deployer's own Vercel project, the same way locally (`eve dev`) and in
production (`eve deploy`), and calls models through that team's AI Gateway: inference is billed
to the deployer, not to seodraft.

eve discovers every capability from the filesystem under `agent/`. There is no central
registry or wiring file: a tool's name is its filename, a connection's name is its filename,
and so on.

## Project structure

```text
agent/
  agent.ts                  # root model (defineAgent; id from lib/models.ts, mock under EVE_MOCK_MODEL)
  instructions.md           # base system prompt / behavior and job routing
  channels/
    slack.ts                # Slack surface; credentials via Vercel Connect; edits ignored
    eve.ts                  # HTTP API; dev-only shim that presents the TUI as a user
  connections/
    seodraft.ts             # seodraft MCP server, user-scoped OAuth; approval via lib/seodraft-approval.ts
  memory/
    preferences.ts          # per-writer file memory (private Blob), scoped by principal
  sandbox.ts                # Vercel Sandbox environment (seeded skill files only)
  subagents/
    researcher/             # routed model (auto), web_search + web_fetch only, tool: false
    reviewer/               # get_surface_rubric only, tool: false
  tools/
    research.ts             # workflow tool → researcher, structured findings
    review.ts               # workflow tool → reviewer, structured verdict
    check_style.ts          # workflow tool: banned words → decide() rules → reviewer fallback
    detect_surface.ts       # decide() choice over the style skills' descriptions
    upload_asset.ts         # Vercel Blob: store text/binary (private)
    list_assets.ts          # Vercel Blob: browse, paginated
    get_asset_info.ts       # Vercel Blob: metadata
    download_asset.ts       # Vercel Blob: read back (Blob URLs only, size-capped)
    delete_asset.ts         # Vercel Blob: delete (approval-gated)
    bash.ts, edit_file.ts, write_file.ts  # disableTool(): the sandbox is read-only for the model
  lib/
    models.ts               # AI Gateway model ids
    mock-model.ts           # scripted mock models for offline evals
    seodraft-approval.ts    # which seodraft calls pause for a button
    subagent.ts             # askSubagent: one structured turn of a declared subagent
    review-schema.ts        # reviewer verdict schema (review + check_style)
    banned-words.ts         # literal, ReDoS-safe banned-word matcher
    reserved-paths.ts       # Blob prefixes the asset tools refuse
    *.generated.ts          # SURFACES, SURFACE_DESCRIPTIONS, BANNED_WORDS
  skills/
    seo-planning/           # onboarding, markets, evidence, site audit, content map, topics, calendar
    seo-article/            # next_write → brief → body → run_gate → approve_post, translations
    linkedin-style/         # SKILL.md + references/{best-practices.md, post-specs.md, banned-words.json}
    x-style/                # SKILL.md + references/{best-practices.md, post-specs.md, banned-words.json}
    newsletter-style/       # SKILL.md + references/{best-practices.md, email-specs.md, banned-words.json}
evals/
  offline/                  # mock-model evals (pnpm eval:offline)
  live/                     # real-model evals (pnpm eval)
tests/                      # node:test smoke tests (pnpm test:smoke)
shared-references/          # house-wide writing rules (source of truth), synced into each skill
scripts/
  sync-shared.mjs           # syncs shared refs; generates surfaces, banned words, reviewer rubric
```

## Core components

| Component | Lives in | eve primitive | Responsibility |
| --- | --- | --- | --- |
| Slack surface | `agent/channels/slack.ts` | Channel | Receives @mentions/DMs, threads replies, renders approvals and sign-in prompts |
| Agent runtime | `agent/agent.ts` + `instructions.md` | Agent | The model loop; routes each request to a skill and enforces seodraft's non-negotiables |
| seodraft access | `agent/connections/seodraft.ts` + `agent/lib/seodraft-approval.ts` | Connection (MCP) | Every seodraft tool, as the signed-in person; human-act, confirming, and paid calls are approval-gated |
| SEO skills | `agent/skills/seo-planning/`, `agent/skills/seo-article/` | Skill | Order of work in a thread; the editorial standard itself comes from seodraft's `get_skill` |
| Style skills | `agent/skills/<surface>-style/` | Skill | Voice/structure rules for repurposing (LinkedIn, X, newsletter); house-wide rules synced in from `shared-references/` |
| Style check | `agent/tools/check_style.ts` | Workflow tool | Banned words (deterministic), then decision-model rules, then the reviewer when a rule is too close to call |
| Asset tools | `agent/tools/{upload,list,get_asset_info,download,delete}_asset.ts` | Tools | Store and manage files (article images, exports) in private Vercel Blob |
| Writer memory | `agent/memory/preferences.ts` | Memory (file) | Per-writer standing preferences for social posts, recalled before each turn, scoped by principal |
| Researcher | `agent/subagents/researcher/` + `agent/tools/research.ts` | Subagent + workflow tool | Fresh-context web research for facts the seodraft brief and evidence bank don't cover; returns cited findings + gaps, never first-hand evidence |
| Reviewer | `agent/subagents/reviewer/` + `agent/tools/review.ts` | Subagent + workflow tool | Fresh-context, verdict-only review of a finished social post or newsletter; articles are judged by `run_gate` instead |

Channels and the connection are I/O boundaries. Tools run in the app runtime (full
`process.env`). Skills only add instructions to context; they are not an execution surface. The
`researcher` and `reviewer` subagents each run in their own isolated child session — fresh
context, none of the root's skills or connections — so the root passes what each needs in the call
`message`.

## Data stores

- **seodraft** (external, user-owned): profile, markets, evidence bank, site audits, content map,
  topic bank, calendar, briefs, drafts, rules results, and the delivery configuration. The agent
  never holds a shared seodraft credential; it acts as each person via their own OAuth token.
- **The site's git repository or Sanity dataset** (external): where `approve_post` /
  `deliver_draft` write the approved article as a draft. seodraft writes it, not the agent.
- **Vercel Blob** (private store): article images, exports, and attachments, plus eve file memory
  under `eve/memory/`. Authenticated by the project's OIDC token (no `BLOB_READ_WRITE_TOKEN`). The
  asset tools refuse `eve/memory/` and the legacy `writer-preferences/` prefix.
- **Vercel Workflows**: eve's durable session state (turns, approvals, workflow tools).
- **Vercel Sandbox** (`$HOME/.agents/skills/...`): holds the seeded skill files the model reads.
  Not a durable application data store.

There is no application database.

## External integrations

| Integration | Purpose | Method |
| --- | --- | --- |
| Slack | Chat surface (inbound events + outbound messages) | Vercel Connect connector (`SLACK_CONNECTOR`), webhook trigger at `/eve/v1/slack` |
| seodraft (MCP) | SEO workspace: planning, drafting, rules, approval, delivery | MCP connection at `https://seodraft.app/mcp` with user-scoped OAuth via Vercel Connect (`SEODRAFT_CONNECTOR`, default `seodraft.app/seodraft`) |
| Vercel Blob | File storage and writer memory | `@vercel/blob`, OIDC-authenticated, private access |
| Vercel AI Gateway | Model access, billed to the deployer's team | Gateway model ids in `agent/lib/models.ts`, OIDC-authenticated; Parallel web search for the researcher |
| Vercel Sandbox | Isolated runtime that holds seeded skill files | `agent/sandbox.ts` (`VercelSandbox.environment()`) |

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
- **Human-in-the-loop:** `seodraftApproval` gates the calls that record the human's decision or
  write to the site (`approve_post`, `approve_profile`, `approve_content_map`,
  `add_cluster_topics`, `deliver_draft`, `archive_topic`), the confirming call of the dry-run tools
  (`archive_post`, `merge_topics`, `start_site_audit` with `confirm: true`), and every call that
  can spend the user's DataForSEO balance. `delete_asset` is gated with `approval` from
  `eve/tools/approval`. Each renders as a Slack approve/deny button only the right person can
  answer.
- **Spend ceilings:** seodraft refuses paid runs that would break its per-run, per-audit, or
  rolling 24h ceiling before spending, independent of the agent.
- **Input hardening:** banned words are matched literally (no ReDoS) and input length is bounded;
  `download_asset` only reads `*.blob.vercel-storage.com` URLs (no SSRF) and caps size; asset paths
  are decoded once and ambiguous encodings are refused.
- **Per-writer isolation:** file memory is scoped by the resolved principal (`byPrincipal`), never
  model input, and only for `principalType: "user"`. The store is private.
- **Subagent isolation:** `defaultTools: false` on both subagents, so fetched web content never
  reaches a shell or the sandbox filesystem.

## Development & testing

- **Runtime/TUI:** `pnpm dev` (eve dev TUI).
- **Type checking:** `pnpm typecheck` (tsc).
- **Lint/format:** `pnpm check` / `pnpm fix` (Ultracite, a Biome preset; config in
  `biome.jsonc`).
- **Smoke tests:** `pnpm test:smoke` (Blob path guards, `node:test`).
- **Evals:** `pnpm eval:offline` (mock models: approvals including the seodraft policy, memory,
  delegation, reserved paths); `pnpm eval` (live research through the AI Gateway).
- **Discovery diagnostics:** `npx eve info` (must report 0 errors / 0 warnings).

## Future considerations

- **Scheduled writing.** seodraft issues user tokens only. eve schedules run as the app by default
  but can pass a user's auth, so a schedule could run a weekly pipeline digest as the person who
  set it up. Not built yet.
- **Vercel Connect catalog.** Submitting seodraft as a Connect service would show it by name and
  icon in the connector picker.

## Glossary

- **eve:** the agent framework powering this app; discovers capabilities from `agent/`.
- **seodraft:** the SEO workspace the agent works in; the system of record and the rules.
- **Channel:** an inbound/outbound surface (here, Slack).
- **Connection:** an external server (MCP/OpenAPI) exposed to the model; tools are found with
  `eve__search` and called with `eve__tool`, and are named `<connection>__<tool>` in approval
  policies and events.
- **Tool:** a typed action authored with `defineTool`, run in the app runtime.
- **Skill:** a load-on-demand Markdown procedure; the packaged form requires `description`
  frontmatter used for routing.
- **Subagent:** a declared agent under `agent/subagents/<id>/`. Here both set `tool: false` and are
  reached through workflow tools (`research`, `review`); each runs in its own fresh child session
  and inherits none of the root's skills, connections, or tools.
- **Surface:** a repurposing content type with its own style skill (LinkedIn, X, newsletter).
- **Shared references:** house-wide writing rules in `shared-references/` (the source of
  truth), copied into every skill by `scripts/sync-shared.mjs`.
- **Vercel Connect:** brokers OAuth/credentials for Slack and seodraft; connectors are
  identified by a UID.
- **OIDC:** the project's Vercel identity token, used to authenticate Blob (and AI Gateway)
  without static keys.
