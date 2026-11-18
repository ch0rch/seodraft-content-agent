/**
 * AI Gateway model ids used across the agent, kept in one place so a model change is one edit.
 *
 * @remarks
 * Every id is a Vercel AI Gateway id (`provider/model`). eve reads each model's context window
 * from the catalog recorded at build time, so an id must exist in the Gateway catalog.
 */

/**
 * Model for the root content assistant.
 *
 * @remarks
 * Sonnet 5.5 instead of Fable 5.2: a quarter of the price per token on the Gateway (USD 2 / 10
 * per million input / output tokens against 8 / 40), and the root mostly calls seodraft's tools
 * and writes against its rules, which Sonnet handles.
 */
export const ROOT_MODEL = "anthropic/claude-sonnet-5.5";

/**
 * Model for the fresh-context `reviewer` subagent.
 */
export const REVIEW_MODEL = "openai/gpt-6.1-sol";

/**
 * Research model for deep work: many sources, conflicting evidence, cross-domain synthesis.
 *
 * @remarks
 * Opus 5.5 (USD 4 / 20 per million tokens), half the price of Fable 5.2, so the router still has
 * a stronger model to pick than {@link STANDARD_RESEARCH_MODEL} for deep questions.
 */
export const DEEP_RESEARCH_MODEL = "anthropic/claude-opus-5.5";

/**
 * Research model for routine lookups, and the researcher's fallback when the router fails.
 */
export const STANDARD_RESEARCH_MODEL = "anthropic/claude-sonnet-5.5";

/**
 * Decision model behind both the researcher's model router (`auto` from `eve/models`) and the
 * `check_style` tool's judgment questions (`decide` from `eve/ai`).
 *
 * @remarks
 * A Gateway `evaluation` model implementing AI SDK decision specification `v4`. It answers typed
 * questions with probabilities; it does not generate text.
 */
export const DECISION_MODEL = "google/gemini-decision-1";
