# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project overview

seodraft for Slack: an SEO content agent built on the [eve](https://eve.dev) 1.0 agent framework.
People @mention it in Slack; it works their **seodraft** workspace through the seodraft MCP
server (user-scoped OAuth via Vercel Connect): site audit, content map, planning, briefs, drafts,
the `run_gate` rules check, approval, and delivery. Approved articles are repurposed with
per-surface style **skills** (LinkedIn, X, newsletter). Files are stored in a private **Vercel
Blob** store, which also holds per-writer memory. Models run through the deployer's own Vercel AI
Gateway.

seodraft owns the article standard (`get_skill`) and the rules (`run_gate`). Never copy that
standard into this repo; the SEO skills only describe the order of work in a thread.

The whole agent is defined under `agent/`. eve discovers capabilities from the filesystem.
See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the component map, data flow, and boundaries.

## Setup & commands

```bash
pnpm install        # install dependencies (Node >= 24)
pnpm dev            # eve dev — local TUI
pnpm typecheck      # tsc (TypeScript, no emit)
pnpm check          # ultracite (Biome) lint + format check
pnpm fix            # ultracite (Biome) auto-fix
pnpm test:smoke     # node:test smoke tests (tests/*.test.mjs)
pnpm eval:offline   # mock-model evals (evals/offline), no provider calls
pnpm eval           # live evals (evals/live) through the AI Gateway
pnpm build          # eve build (needs a linked project; --skip-sandbox-prewarm without one)
eve deploy          # deploy to Vercel production (use this, not raw `vercel deploy`)
npx eve info        # print the discovered surface + discovery diagnostics
```

**Verify changes with `pnpm typecheck`, `pnpm check`, `pnpm test:smoke`, `pnpm eval:offline`, and
`npx eve info` (0 errors / 0 warnings), then exercise the agent in the `pnpm dev` TUI.**

## eve conventions

- **Read the relevant guide in `node_modules/eve/docs/` before writing code.** Don't invent
  framework APIs; confirm them against the docs.
- **Identity comes from the filesystem, never a `name` field.** A tool at
  `agent/tools/upload_asset.ts` is the tool `upload_asset`; a connection at
  `agent/connections/seodraft.ts` registers as `seodraft`; memory at
  `agent/memory/preferences.ts` adds `preferences__save_memory` and `preferences__remove_memory`.
- Authored slots: `agent/agent.ts` (model), `agent/instructions.md` (system prompt),
  `agent/tools/*.ts` (`defineTool` / `defineWorkflowTool` / `disableTool()`),
  `agent/connections/*.ts`, `agent/channels/*.ts`, `agent/memory/*.ts` (`defineMemory`),
  `agent/skills/<name>/SKILL.md`, `agent/subagents/<id>/agent.ts` (`defineAgent`), `agent/sandbox.ts`.
- **Models** are AI Gateway ids kept in `agent/lib/models.ts`. eve reads each model's context window
  from the catalog recorded at build time, so an id must exist in the Gateway catalog.
- **Tools** run in the app runtime (full `process.env`), one default export per file. Gate
  destructive tools with `approval` from `eve/tools/approval`. Tool code can't read skill files at
  runtime (`ctx.getSkill()` is gone); data a tool needs from a skill folder is generated into a
  module by `scripts/sync-shared.mjs`.
- **Connections** accept the same `approval` field. `seodraft` uses `seodraftApproval` from
  `agent/lib/seodraft-approval.ts`, which gates human acts, confirming calls, and paid calls. eve
  passes the qualified name (`seodraft__approve_post`); the policy strips the prefix. The model
  reaches connection tools through `eve__search` and `eve__tool`.
- **Skills** are load-on-demand. A packaged skill (`<name>/SKILL.md`) requires `description`
  frontmatter; that description is the routing hint. Adding a surface is a new `<surface>-style`
  skill folder: `pnpm sync:shared` regenerates `SURFACES`, `SURFACE_DESCRIPTIONS`, `BANNED_WORDS`,
  and the reviewer rubric from those folders, so there is no hand-edited enum to keep in step.
- **Shared references** live in `shared-references/` (the source of truth). `scripts/sync-shared.mjs`
  copies them into every skill's `references/` and regenerates the managed `## Shared references`
  section in each `SKILL.md`. Edit the source and run `pnpm sync:shared` (also run on
  `predev`/`prebuild`); never edit the synced copies, the generated modules, or that section.
- **Subagents** are declared under `agent/subagents/<id>/agent.ts` with `tool: false` and
  `defaultTools: false`. The root reaches them only through the `research` and `review` workflow
  tools (`askSubagent` in `agent/lib/subagent.ts`), which request a structured result per turn. A
  subagent inherits nothing from the root, so the caller packs everything into the message.
- **Offline evals** run on mock models (`agent/lib/mock-model.ts`, `EVE_MOCK_MODEL=1`): a user
  message that is JSON `{ "tool", "input" }` makes the root call that tool once. Never set
  `EVE_MOCK_MODEL` on a deployment that serves people.
- After editing, **check LSP diagnostics / `pnpm typecheck`** and fix type errors before
  moving on.

## Code style

- Linting and formatting are handled by **Ultracite** (a Biome preset). Run `pnpm check`
  before finishing and `pnpm fix` to auto-fix. Config is in `biome.jsonc`; the kebab-case
  filename rule is disabled there because eve tools use snake_case names.
- TypeScript strict; ESM with `NodeNext` resolution (relative imports need a `.js`
  extension). Prefer `const`, arrow functions, optional chaining / nullish coalescing.
- Validate tool input/output with `zod` schemas.
- Document exported config with **TSDoc** (`@remarks`, `@param`, `@returns`, `@defaultValue`,
  `@see`). Avoid inline `//` comments — put rationale in the TSDoc block instead.

## Security

- **Never ask the user for API keys, client secrets, or any other credentials.**
- **Never commit secrets.** `.env*` is gitignored. Connector UIDs are read from env
  (`SLACK_CONNECTOR`, `SEODRAFT_CONNECTOR`); seodraft auth is per-user via Vercel Connect, and Blob
  and the AI Gateway authenticate with the project's OIDC token — there are no API keys in code.
  DataForSEO credentials are entered in the seodraft web app only, never in Slack.
- When building a `RegExp` from data, escape it (literal match) to avoid ReDoS; bound
  untrusted input length.
- Gate irreversible or high-impact actions behind `approval`: `delete_asset`, and the seodraft
  calls in `APPROVAL_REQUIRED_TOOLS`. When you add a seodraft tool to the policy, add a case to
  `evals/offline/seodraft-approval.eval.ts`.
- Per-writer memory is scoped by the resolved principal (`byPrincipal`), never model input, and
  only for `principalType: "user"`. The asset tools refuse the `eve/memory/` and
  `writer-preferences/` Blob prefixes (`agent/lib/reserved-paths.ts`), and the store is private.

## Before committing

- `pnpm typecheck`, `pnpm check`, `pnpm test:smoke`, and `pnpm eval:offline` pass.
- `npx eve info` reports 0 errors / 0 warnings.
- No secrets, `node_modules`, or build output (`.eve`, `.vercel`, `.output`) staged.
