# seodraft for Slack

An SEO content agent for Slack, built on [eve](https://eve.dev) and powered by
[seodraft](https://seodraft.app). @mention it in a channel or DM it, and it plans your topic bank,
writes the next scheduled article against seodraft's editorial standard, runs seodraft's rules
check, and delivers the approved draft to your site's repository. Then it turns the article into
LinkedIn posts, X posts, and newsletter sections.

- **Lives in Slack.** Answers @mentions and DMs, works in threads, and renders every approval as a
  button.
- **seodraft is the system of record.** Profile, evidence bank, topic bank, calendar, briefs,
  drafts, the deterministic `run_gate` check, and delivery to git all stay in seodraft. The agent
  reads the editorial standard from seodraft at runtime, so it never drifts from it.
- **Each person signs in as themselves.** seodraft is connected through
  [Vercel Connect](https://vercel.com/docs/connect) with user-scoped OAuth: every Slack user
  authorizes their own seodraft account and sees only the workspaces it can open. No API keys.
- **The human approves.** Approving an article or a profile, delivering a draft, retiring or
  merging, and every call that spends the user's DataForSEO balance pause for an approve/deny
  button before they run.
- **Repurposes approved articles.** One editable style skill per social surface (LinkedIn, X,
  newsletter), enforced by a deterministic banned-words lint and a fresh-context reviewer.

## What you need

- A [seodraft](https://seodraft.app) account with at least one workspace.
- A Vercel account and a Slack workspace where you can install an app.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?project-name=seodraft-content-agent&repository-name=seodraft-content-agent&repository-url=https%3A%2F%2Fgithub.com%2Fch0rch%2Fseodraft-content-agent&connect=%5B%7B%22type%22%3A%22slack%22%2C%22env%22%3A%22SLACK_CONNECTOR%22%2C%22triggers%22%3Atrue%2C%22triggerPath%22%3A%22%2Feve%2Fv1%2Fslack%22%7D%2C%7B%22type%22%3A%22seodraft.app%22%2C%22env%22%3A%22SEODRAFT_CONNECTOR%22%7D%5D&stores=%5B%7B%22type%22%3A%22blob%22%2C%22access%22%3A%22public%22%7D%5D)

The Deploy button provisions what the agent needs and wires it up:

- a **Slack** connector (sets `SLACK_CONNECTOR`, with the event trigger pointed at
  `/eve/v1/slack`),
- a **seodraft** connector (sets `SEODRAFT_CONNECTOR`); Vercel Connect registers the OAuth
  client with seodraft on its own,
- a **Vercel Blob** store for the asset tools.

Once deployed, @mention the bot in Slack. The first time it needs seodraft, it sends you a private
sign-in link; authorize your seodraft account and the conversation continues.

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
| Agent framework | [eve](https://eve.dev) |
| SEO workspace | [seodraft](https://seodraft.app) MCP server, user-scoped OAuth via [Vercel Connect](https://vercel.com/docs/connect) |
| Chat surface | Slack, via [Vercel Connect](https://vercel.com/docs/connect) |
| File storage | [Vercel Blob](https://vercel.com/docs/vercel-blob) |
| Model access | [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) |
| Sandbox | [Vercel Sandbox](https://vercel.com/docs/sandbox) |
| Lint & format | [Ultracite](https://www.ultracite.ai/) (Biome) |

**Zero static keys.** Slack and seodraft authenticate through Vercel Connect; Blob and the model
authenticate with the project's [Vercel OIDC](https://vercel.com/docs/oidc) token. DataForSEO
credentials, when a workspace uses them, are entered in the seodraft web app and never pass
through Slack.

## What's inside

```text
agent/
  agent.ts                  # model configuration
  instructions.md           # the agent's behavior
  channels/slack.ts         # Slack surface (Vercel Connect credentials)
  channels/eve.ts           # HTTP API; dev-only shim so the TUI acts as a user
  connections/seodraft.ts   # seodraft MCP server, user-scoped OAuth; approval policy per tool
  sandbox.ts                # Vercel Sandbox backend
  subagents/
    researcher/             # fresh-context web researcher (citations, never first-hand evidence)
    reviewer/               # fresh-context reviewer for social posts and newsletters
  tools/
    lint_against_style.ts   # deterministic banned-words check for social surfaces
    upload_asset.ts         # Vercel Blob: store text or binary content
    list_assets.ts          # Vercel Blob: browse stored assets
    get_asset_info.ts       # Vercel Blob: metadata without downloading
    download_asset.ts       # Vercel Blob: read a stored file back
    delete_asset.ts         # Vercel Blob: delete (requires approval)
    get_writer_preferences.ts   # load this writer's saved social-post preferences
    save_writer_preferences.ts  # save standing preferences (per-writer, principal-scoped)
    clear_writer_preferences.ts # clear this writer's preferences (requires approval)
  lib/
    writer-preferences.ts   # principal-scoped Blob key + reserved-prefix guard
    surfaces.generated.ts   # generated SURFACES enum (style skill folders are the source of truth)
  skills/
    seo-planning/           # onboarding, profile, evidence, topic bank, calendar
    seo-article/            # next_write → brief → body → run_gate → approve_post
    linkedin-style/         # repurposing: + best-practices.md and post-specs.md
    x-style/                # repurposing: + best-practices.md and post-specs.md
    newsletter-style/       # repurposing: + best-practices.md and email-specs.md
shared-references/          # house-wide writing rules (source of truth), synced into each skill
scripts/
  sync-shared.mjs           # syncs shared refs into skills; generates SURFACES + reviewer rubric
```

## Approvals

`agent/connections/seodraft.ts` decides which seodraft calls stop for a button:

| Pauses for approval | Why |
| --- | --- |
| `approve_post`, `approve_profile`, `deliver_draft`, `archive_topic` | They record or carry out the human's decision, or write to the site's git repository |
| `archive_post`, `merge_topics` with `confirm: true` | The dry run is free; only the confirming call changes anything |
| `add_topics`, `complete_onboarding`, `propose_topics`, `refresh_metrics`, `research_topic`, `suggest_topics` | They can spend the user's DataForSEO balance |

Everything else (reads, `upsert_post`, `run_gate`, scheduling) runs without a prompt. Edit
`APPROVAL_REQUIRED_TOOLS` to change it.

## Local development

Link the project you deployed (or a fresh one), attach the seodraft connector, and pull its
environment:

```bash
vercel link
vercel connect attach seodraft.app/seodraft --yes
vercel env pull
```

Then run the development server and link a model provider with `/model` in the TUI:

```bash
pnpm dev
```

You can chat with the agent in the dev TUI to test the seodraft, style-lint, and Blob flows; the
first seodraft call prints a sign-in link. The Slack surface itself only runs against a
deployment. Ship changes with:

```bash
eve deploy
```

### Linting and formatting

```bash
pnpm check   # check formatting and lint rules
pnpm fix     # auto-fix what is fixable
```

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

# Blob store, connected to the project for all environments
vercel blob create-store <name> --access public --yes
```

## Customizing

- **Article standard:** lives in seodraft (`get_skill`, `run_gate`), not in this repo. Change the
  workspace profile (voice, article style, CTA, table of contents, internal links) from seodraft.
- **How the agent works seodraft:** edit `agent/skills/seo-planning/SKILL.md` and
  `agent/skills/seo-article/SKILL.md`.
- **Social voice:** edit the per-surface skills in `agent/skills/*-style/SKILL.md`, and the
  `references/banned-words.json` each one lints against. Add a surface by adding a
  `<surface>-style` skill folder and running `pnpm sync:shared`.
- **House-wide rules:** edit `shared-references/`, then run `pnpm sync:shared` (also runs on
  `pnpm dev` and `pnpm build`). Never edit the synced copies or generated files directly.
- **Behavior:** edit `agent/instructions.md`.
- **Model:** edit `agent/agent.ts` (or run `/model` in the dev TUI).
- **Approvals:** edit `APPROVAL_REQUIRED_TOOLS` in `agent/connections/seodraft.ts`.

## Known limits

- **No scheduled runs yet.** seodraft issues user tokens only, and eve schedules run as the app,
  so a cron job cannot call seodraft on its own. Writing starts from a message in Slack.

## Learn more

- [seodraft](https://seodraft.app)
- [eve documentation](https://eve.dev/docs/introduction)
- [Vercel Connect](https://vercel.com/docs/connect)
- [Vercel Blob](https://vercel.com/docs/vercel-blob)

## Credits

Forked from Vercel Labs'
[eve Content Agent Template](https://github.com/vercel-labs/eve-content-agent-template)
(Apache-2.0).
