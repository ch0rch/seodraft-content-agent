# seodraft for Slack

An SEO content agent for Slack, built on [eve](https://eve.dev) 1.0 and powered by
[seodraft](https://seodraft.app). @mention it in a channel or DM it, and it audits your site,
builds the content map, plans your topic bank, writes the next scheduled article against
seodraft's editorial standard, runs seodraft's rules check, and delivers the approved draft to your
site's repository or CMS. Then it turns the article into LinkedIn posts, X posts, and newsletter
sections.

- **Lives in Slack.** Answers @mentions and DMs, works in threads (each thread is one shared
  session), shows a live task card, and renders every approval as a button only the right person
  can press.
- **seodraft is the system of record.** Profile, markets, evidence bank, site audit, content map,
  topic bank, calendar, briefs, drafts, the deterministic `run_gate` check, and delivery all stay in
  seodraft. The agent reads the editorial standard from seodraft at runtime, so it never drifts
  from it.
- **Your inference, your account.** The agent runs in your Vercel project and calls models through
  your team's [AI Gateway](https://vercel.com/docs/ai-gateway), authenticated by the project's OIDC
  token. Model usage is billed to your Vercel team, never to seodraft, the same way paid SEO data
  runs on your own DataForSEO account.
- **Each person signs in as themselves.** seodraft is connected through
  [Vercel Connect](https://vercel.com/docs/connect) with user-scoped OAuth: every Slack user
  authorizes their own seodraft account and sees only the workspaces it can open. No API keys.
- **The human approves.** Approving an article, the profile, or the content map, adding to the map,
  delivering a draft, retiring or merging, starting a site audit, and every call that spends the
  user's DataForSEO balance pause for an approve/deny button before they run.
- **Repurposes approved articles.** One editable style skill per social surface (LinkedIn, X,
  newsletter), checked by `check_style` (banned words, then a decision model) and a fresh-context
  reviewer. Standing preferences per writer live in eve memory.

## What you need

- A [seodraft](https://seodraft.app) account with at least one workspace.
- A Vercel account with AI Gateway access, and a Slack workspace where you can install an app.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?project-name=seodraft-content-agent&repository-name=seodraft-content-agent&repository-url=https%3A%2F%2Fgithub.com%2Fch0rch%2Fseodraft-content-agent&connect=%5B%7B%22type%22%3A%22slack%22%2C%22env%22%3A%22SLACK_CONNECTOR%22%2C%22triggers%22%3Atrue%2C%22triggerPath%22%3A%22%2Feve%2Fv1%2Fslack%22%7D%2C%7B%22type%22%3A%22seodraft.app%22%2C%22env%22%3A%22SEODRAFT_CONNECTOR%22%7D%5D&stores=%5B%7B%22type%22%3A%22blob%22%2C%22access%22%3A%22private%22%7D%5D)

The Deploy button provisions what the agent needs and wires it up:

- a **Slack** connector (sets `SLACK_CONNECTOR`, with the event trigger pointed at
  `/eve/v1/slack`),
- a **seodraft** connector (sets `SEODRAFT_CONNECTOR`). seodraft is not in the Connect catalog
  yet, so in the **seodraft.app** row choose **Add** → **OAuth** → **Managed** and enter
  `https://seodraft.app` as the server URL. Vercel Connect discovers the endpoints and registers
  the OAuth client with seodraft on its own,
- a private **Vercel Blob** store for the asset tools and per-writer memory.

Once deployed, @mention the bot in Slack. The first time it needs seodraft, it sends you a private
sign-in link; authorize your seodraft account and the conversation continues. Sessions, model
calls, tool calls, and approvals show up under **Agent Runs** in the Vercel dashboard.

## How a conversation goes

```text
you:   @seodraft what's next on the calendar?
agent: next_write → "How long does a Shopify migration take?" (scheduled Tuesday).
       Brief: intent, template, angle, 3 accepted evidence pieces, outline. Write it?
you:   go
agent: upsert_post (brief, then body) → run_gate passed. Here's the article.
you:   ship it
agent: [Approve / Deny] approve_post
       Approved and delivered as a draft to your-org/your-site.
       Want a LinkedIn post from it?
```

## Tech stack

| Layer | Technology |
| --- | --- |
| Agent framework | [eve](https://eve.dev) 1.0 |
| SEO workspace | [seodraft](https://seodraft.app) MCP server, user-scoped OAuth via [Vercel Connect](https://vercel.com/docs/connect) |
| Chat surface | Slack, via [Vercel Connect](https://vercel.com/docs/connect) |
| Model access | [Vercel AI Gateway](https://vercel.com/docs/ai-gateway), billed to your team |
| Memory and files | [Vercel Blob](https://vercel.com/docs/vercel-blob) (private store) |
| Sandbox | [Vercel Sandbox](https://vercel.com/docs/sandbox) |
| Lint & format | [Ultracite](https://www.ultracite.ai/) (Biome) |

**Zero static keys.** Slack and seodraft authenticate through Vercel Connect; Blob and the model
authenticate with the project's [Vercel OIDC](https://vercel.com/docs/oidc) token. DataForSEO
credentials, when a workspace uses them, are entered in the seodraft web app and never pass
through Slack.

## What's inside

```text
agent/
  agent.ts                  # root model (AI Gateway id from lib/models.ts)
  instructions.md           # the agent's behavior
  channels/slack.ts         # Slack surface (Vercel Connect credentials)
  channels/eve.ts           # HTTP API; dev-only shim so the TUI acts as a user
  connections/seodraft.ts   # seodraft MCP server, user-scoped OAuth
  memory/preferences.ts     # per-writer standing preferences (eve file memory)
  sandbox.ts                # Vercel Sandbox environment (skill files only)
  subagents/
    researcher/             # fresh-context web researcher (citations, never first-hand evidence)
    reviewer/               # fresh-context reviewer for social posts and newsletters
  tools/
    research.ts             # workflow tool: one turn of the researcher, structured findings
    review.ts               # workflow tool: one turn of the reviewer, structured verdict
    check_style.ts          # banned words, decision-model rules, reviewer fallback
    detect_surface.ts       # which social surface a request is for
    upload_asset.ts         # Vercel Blob: store text or binary content
    list_assets.ts          # Vercel Blob: browse stored assets
    get_asset_info.ts       # Vercel Blob: metadata without downloading
    download_asset.ts       # Vercel Blob: read a stored file back
    delete_asset.ts         # Vercel Blob: delete (requires approval)
    bash.ts, edit_file.ts, write_file.ts  # turn those built-ins off
  lib/
    models.ts               # every AI Gateway model id in one place
    seodraft-approval.ts    # which seodraft calls pause for a button
    reserved-paths.ts       # Blob prefixes the asset tools refuse (writer memory)
    *.generated.ts          # surfaces, banned words, reviewer rubric (from the skill folders)
  skills/
    seo-planning/           # onboarding, markets, evidence, site audit, content map, topics, calendar
    seo-article/            # next_write → brief → body → run_gate → approve_post, translations
    linkedin-style/         # repurposing: + best-practices.md and post-specs.md
    x-style/                # repurposing: + best-practices.md and post-specs.md
    newsletter-style/       # repurposing: + best-practices.md and email-specs.md
evals/
  offline/                  # mock-model evals: approvals, memory, delegation, reserved paths
  live/                     # real-model evals through the AI Gateway
shared-references/          # house-wide writing rules (source of truth), synced into each skill
scripts/sync-shared.mjs     # syncs shared refs; generates surfaces, banned words, reviewer rubric
tests/                      # node:test smoke tests for the Blob path guards
```

## Approvals

`agent/lib/seodraft-approval.ts` decides which seodraft calls stop for a button:

| Pauses for approval | Why |
| --- | --- |
| `approve_post`, `approve_profile`, `approve_content_map`, `add_cluster_topics`, `deliver_draft`, `archive_topic` | They record or carry out the human's decision, or write to the site's repository or CMS |
| `archive_post`, `merge_topics`, `start_site_audit` with `confirm: true` | The dry run is free; only the confirming call changes anything or spends |
| `add_topics`, `complete_onboarding`, `propose_topics`, `refresh_metrics`, `research_topic`, `suggest_topics` | They can spend the user's DataForSEO balance |

`site_audit_status` is not gated: each poll is charged against the estimate approved with
`start_site_audit`, and the audit is polled every 20 to 30 seconds. Everything else (reads,
`upsert_post`, `run_gate`, scheduling, `submit_content_map`, translation links) runs without a
prompt. Edit `APPROVAL_REQUIRED_TOOLS` to change it; `evals/offline/seodraft-approval.eval.ts`
pins the current policy.

## Local development

Link the project you deployed (or a fresh one), attach the seodraft connector, and pull its
environment:

```bash
vercel link
vercel connect attach seodraft.app/seodraft --yes
vercel env pull
```

Then run the development server:

```bash
pnpm dev
```

If your Vercel team has AI Gateway access, the TUI uses your Vercel CLI credentials for models;
otherwise link one with `/model`. You can chat with the agent to test the seodraft, style, and Blob
flows; the first seodraft call prints a sign-in link. The Slack surface itself only runs against a
deployment. Ship changes with:

```bash
eve deploy
```

### Checks

```bash
pnpm typecheck      # tsc
pnpm check          # Ultracite (Biome) lint + format check
pnpm test:smoke     # node:test smoke tests
pnpm eval:offline   # mock-model evals, no provider calls, seconds
pnpm eval           # live evals through the AI Gateway (costs model usage)
npx eve info        # discovered surface; must report 0 errors, 0 warnings
```

`eve build` prepares the Vercel Sandbox snapshot and needs a linked project; pass
`--skip-sandbox-prewarm` to compile without one.

### Setting up the connectors by hand

The Deploy button provisions these for you. To set them up manually, use the
[Vercel CLI](https://vercel.com/docs/cli):

```bash
# seodraft connector (UID seodraft.app/seodraft -> SEODRAFT_CONNECTOR)
vercel connect create seodraft.app --name seodraft
vercel connect attach seodraft.app/seodraft --yes

# Slack connector (note the UID, e.g. slack/<name> -> SLACK_CONNECTOR), then point its
# event trigger at the route the agent serves
vercel connect create slack --name <name> --triggers
vercel connect attach slack/<name> --triggers --trigger-path /eve/v1/slack

# Private Blob store, connected to the project for all environments
vercel blob create-store <name> --access private --yes
```

## Upgrading a deployment from an earlier version

Earlier versions ran eve 0.31 with a public Blob store and kept writer preferences under
`writer-preferences/`. This version keeps them in eve memory in a private store, so saved
preferences don't carry over: writers state them again. Create a private store, connect it to the
project, and remove the public one once nothing else uses it. Sessions from eve 0.81.0 or earlier
never move to a new deployment, so finish open threads before you deploy, and keep the old
deployment running until they end. See the [eve 1.0 upgrade guide](https://eve.dev/docs/guides/upgrade).

## Customizing

- **Article standard:** lives in seodraft (`get_skill`, `run_gate`), not in this repo. Change the
  workspace profile (voice, article style, CTA, table of contents, internal links) from seodraft.
- **How the agent works seodraft:** edit `agent/skills/seo-planning/SKILL.md` and
  `agent/skills/seo-article/SKILL.md`.
- **Social voice:** edit the per-surface skills in `agent/skills/*-style/SKILL.md`, and the
  `references/banned-words.json` each one checks against. Add a surface by adding a
  `<surface>-style` skill folder and running `pnpm sync:shared`.
- **House-wide rules:** edit `shared-references/`, then run `pnpm sync:shared` (also runs on
  `pnpm dev` and `pnpm build`). Never edit the synced copies or generated files directly.
- **Behavior:** edit `agent/instructions.md`.
- **Models:** edit `agent/lib/models.ts`. Any AI Gateway model id works; the ids must exist in the
  Gateway catalog when you build.
- **Approvals:** edit `APPROVAL_REQUIRED_TOOLS` in `agent/lib/seodraft-approval.ts`.

## Known limits

- **No scheduled runs yet.** seodraft issues user tokens only. eve schedules run as the app by
  default; a schedule can pass a user's auth instead, which would let a weekly digest call seodraft
  as that person, but this template doesn't ship one. Writing starts from a message in Slack.

## Learn more

- [seodraft](https://seodraft.app)
- [eve documentation](https://eve.dev/docs)
- [Vercel Connect](https://vercel.com/docs/connect)
- [Vercel AI Gateway](https://vercel.com/docs/ai-gateway)
- [Vercel Blob](https://vercel.com/docs/vercel-blob)

## Credits

Forked from Vercel Labs'
[eve Content Agent Template](https://github.com/vercel-labs/eve-content-agent-template)
(Apache-2.0) and kept in step with its eve 1.0 version.
