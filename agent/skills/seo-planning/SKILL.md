---
description: Use when setting up a seodraft workspace or working on its profile, markets, evidence bank, site audit, content map, topic bank, or content calendar.
---

# Planning in seodraft

## Setting up a workspace

1. `get_profile`. Fill what's missing (business name and description, audience, site URL,
   language, voice) by asking the person, then save it with `update_profile`. Ask which query the
   home page and each selling page should rank for and save them as `pageKeywords`; don't guess.
2. Generate 12–15 questions people ask Google or ChatGPT about the business (questions, not
   article titles) and save them in one `add_topics` call with source `generate`. When it returns a
   `published` or `semanticOverlaps` entry, tell the person which phrase collided with which URL or
   topic before re-sending with `allowSimilar: true` or merging with `merge_topics`.
3. Post a summary (business, audience, voice, language, proposed topics). After the person says yes,
   call `approve_profile` with that summary.
4. `complete_onboarding`, then the `submit_topic_analysis` call it asks for, then `plan_topics` to
   schedule the first week. In preview mode (`dataConnected: false`) there is no measured signal:
   don't claim an AI Overview, a cited domain, or a volume number it didn't return.

## Markets

- `get_profile` lists `markets`, the main market first, as ids like `us-en` or `ar-es`. The main
  market's language is the articles' language, and every paid call that names no market uses it.
- Ask which countries the person sells in before adding markets with `update_profile`: each market
  is measured and audited separately, and paid separately.

## Site audit

1. `start_site_audit` without `confirm` is a free dry run: it names the market, the estimated cost,
   and who pays (included, or the person's DataForSEO balance). Show that, and call it again with
   `confirm: true` only after the person agrees.
2. Advance it with `site_audit_status` every 20 to 30 seconds until the status is `ready` or
   `partial` (partial is usable). Each step is charged against the estimate the person approved.
   Tell the person how far it got instead of polling silently for minutes.
3. `get_audit_findings` returns what the audit observed, each finding with a `ref`. Report only
   those findings, quoting their refs; anything the provider didn't return is unavailable, not
   zero.

## Content map

An approved map already says which clusters to build and in what order. Read `get_content_map`
before proposing new topics, and follow its `next` when the person asks what to write.

1. Build clusters (hub and pieces, each with a purpose and a target search) only from the audit
   findings of the workspace's markets, citing each finding's `ref` character for character.
   Store the proposal with `submit_content_map`; it checks shape and citations, never the strategy.
2. Post the summary and the clusters in the thread. After the person says yes, call
   `approve_content_map` with exactly what they approved. Approving a map is always the person's
   decision, also when `approvalMode` is `agent`.
3. To grow an approved map, read `get_cluster_ideas` (searches a cluster doesn't cover yet), propose
   the additions, and after the person's yes call `add_cluster_topics` with the evidence ref each
   one cites. It costs the same as `add_topics`.
4. `get_link_suggestions` lists the internal links a cluster is missing or carries badly, with the
   words to link. Links on pages seodraft didn't write are the person's to add: hand them the list.

## Topic bank

- `list_topics` to see what's there and in which state each number is.
- New questions: generate them yourself and save with `add_topics` (the same price for 1 or 100
  terms). `propose_topics` and `suggest_topics` are paid DataForSEO paths: use them only when the
  person asks for market-sourced ideas.
- `refresh_metrics` re-measures in one batch; collect every term first instead of calling it per
  term.
- `merge_topics` and `archive_post` return a dry run without `confirm: true`. Show the dry run, and
  call again with `confirm: true` only after the person agrees. `archive_topic` never touches the
  linked article; offer `archive_post` separately.
- `dataforseo_status` reports the connection and the USD balance. DataForSEO credentials are only
  entered in the seodraft web app; never ask for them in Slack.

## Calendar

- `calendar_view` for a month, `list_calendar` for the queue.
- `plan_topics` schedules topic-bank questions (`everyDays`: 1 daily, 7 weekly).
- `reschedule_post` moves an article; `unschedule_post` frees its day without retiring it.

## Site checks

- `import_sitemap` loads what the site already published, so new topics don't collide with it.
- `check_ai_access` reports which AI crawlers the site's robots.txt lets in. It is diagnostic; don't
  recommend unblocking training bots unless the person asks.

## References

- seodraft's tool descriptions carry each tool's price and refusal reasons. Read them through
  `eve__search` before a paid call and quote the price to the person.

## Shared references

Shared global references for all skills in the content agent. These apply regardless of the
content type.

- `references/ai-phrases-to-avoid.md` — AI-tell words, phrases, and punctuation to avoid.
- `references/plain-english-alternatives.md` — plain-English swaps for bloated or vague wording.
