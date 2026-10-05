---
description: Use when writing, revising, checking, or approving an SEO article in a seodraft workspace.
---

# Writing a seodraft article

seodraft owns the editorial standard and the rules that block. This skill is the order of work in a
Slack thread; the rules themselves come from `get_skill`.

## Before the first sentence

1. `next_write`. When it returns a scheduled post, write that post's id and term. Don't create a
   new post while a scheduled one is waiting. If the person named a specific article, `get_post`
   it instead.
2. `get_skill` once per thread, and `get_profile` for this workspace. Honor the profile's
   `articleStyle`, `includeCta`, `includeToc`, `firstPerson`, and `internalLinksMin`.
3. Read `standard`, `serpBrief`, and `customInstructions` from the post. The SERP's People Also Ask
   questions are coverage, not an outline: none becomes an H2 verbatim, and the ones outside the
   angle are dropped. Don't call `research_topic` again unless the post has no SERP brief.
4. `get_linkgraph` for internal-link targets and the templates recent posts used.
5. Pick at least three pieces from `evidence.accepted`. When there aren't three, ask the person for
   first-hand material (a measured number, a named case, a mistake made, a credential) and save each
   one with `add_evidence`; `saidByHuman` is true only for what the person told you in this thread.
   Pending pieces fail the rules.

## Brief, then body

1. Save the brief with `upsert_post` (intent, template, angle, evidence, outline, image slots)
   before writing any body text. Post a short summary of the brief in the thread.
2. Write the body against `get_skill` and save it with `upsert_post`, passing `version` so you never
   overwrite someone else's edit.
3. `run_gate`. Fix what it reports and run it again. After three failed runs in total, stop and
   show the person the remaining findings instead of polishing further.
4. Cannibalization is a hard stop: don't rephrase the term to get around it. Tell the person which
   article or topic it collided with.

## Approval

1. Share the article in the thread with the last `run_gate` result.
2. When the person says to ship it, call `approve_post`. It refuses unless the last `run_gate`
   passed, marks the article ready, and delivers it to the site's git repository as a draft when a
   destination is configured. Delivery is not publishing: the person publishes from their CMS.
3. `deliver_draft` is only for re-sending an already approved article after an edit;
   `delivery_status` says where a workspace delivers.

## Afterwards

Offer to turn the approved article into LinkedIn or X posts, or a newsletter section, with the
matching `<surface>-style` skill.

## References

- seodraft's `get_skill` tool: the editorial standard (answer-first H2s, evidence, banned phrases,
  templates, image slots). It is the source of truth and changes with seodraft; don't copy it here.
- seodraft's `run_gate` tool: the deterministic rules check an article must pass before approval.

## Shared references

Shared global references for all skills in the content agent. These apply regardless of the
content type.

- `references/ai-phrases-to-avoid.md` — AI-tell words, phrases, and punctuation to avoid.
- `references/plain-english-alternatives.md` — plain-English swaps for bloated or vague wording.
