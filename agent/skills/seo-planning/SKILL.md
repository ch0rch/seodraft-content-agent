---
description: Use when setting up a seodraft workspace or working on its profile, evidence bank, topic bank, or content calendar.
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
  `connection_search` before a paid call and quote the price to the person.

## Shared references

Shared global references for all skills in the content agent. These apply regardless of the
content type.

- `references/ai-phrases-to-avoid.md` — AI-tell words, phrases, and punctuation to avoid.
- `references/plain-english-alternatives.md` — plain-English swaps for bloated or vague wording.
