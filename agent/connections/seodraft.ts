import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";

/**
 * Vercel Connect connector UID for the seodraft MCP server.
 *
 * @defaultValue `"seodraft.app/seodraft"` — the UID `vercel connect create seodraft.app
 * --name seodraft` produces (UIDs are `<service>/<name>`). Override with the
 * `SEODRAFT_CONNECTOR` environment variable when your connector uses a different name; the
 * Deploy button sets it for you.
 */
const seodraftConnector =
  process.env.SEODRAFT_CONNECTOR ?? "seodraft.app/seodraft";

/**
 * Bare seodraft tool names that pause for a human approve/deny button before they run.
 *
 * @remarks
 * - `always`: the call records or carries out the human's decision (approving, retiring,
 *   writing to the site's git repository), or it can spend the user's DataForSEO balance. Each
 *   paid tool names its price in its description (about USD 0.004 to USD 0.12), and seodraft
 *   enforces its own per-run and 24h ceilings; the approval puts the spend in front of the
 *   person before it happens.
 * - `confirm`: the tool is a free dry run unless called with `confirm: true`, so only the
 *   confirming call is gated.
 *
 * Every other tool (reads, drafting with `upsert_post`, `run_gate`, scheduling) runs without a
 * prompt.
 */
const APPROVAL_REQUIRED_TOOLS: Record<string, "always" | "confirm"> = {
  add_topics: "always",
  approve_post: "always",
  approve_profile: "always",
  archive_post: "confirm",
  archive_topic: "always",
  complete_onboarding: "always",
  deliver_draft: "always",
  merge_topics: "confirm",
  propose_topics: "always",
  refresh_metrics: "always",
  research_topic: "always",
  suggest_topics: "always",
};

/**
 * seodraft workspace connection (MCP): profile, evidence bank, topic bank, calendar, article
 * drafts, the deterministic rules check (`run_gate`), approval, and delivery to git.
 *
 * @remarks
 * Authorization is user-scoped via Vercel Connect: each person signs in to their own seodraft
 * account through a browser consent flow (seodraft's OAuth server supports dynamic client
 * registration, so Connect registers the client itself). The per-user token is resolved before
 * every tool call and never reaches the model; the agent sees exactly the workspaces that
 * account can open.
 *
 * The approval policy may receive the qualified (`seodraft__approve_post`) or the bare
 * (`approve_post`) tool name, so it strips the connection prefix before the lookup in
 * {@link APPROVAL_REQUIRED_TOOLS}.
 *
 * @see {@link https://seodraft.app | seodraft}
 * @see {@link https://vercel.com/docs/connect | Vercel Connect}
 */
export default defineMcpClientConnection({
  approval: ({ toolName, toolInput }) => {
    const rule = APPROVAL_REQUIRED_TOOLS[toolName.split("__").at(-1) ?? ""];
    const confirmed =
      typeof toolInput === "object" &&
      toolInput !== null &&
      "confirm" in toolInput &&
      toolInput.confirm === true;
    return rule === "always" || (rule === "confirm" && confirmed)
      ? "user-approval"
      : "not-applicable";
  },
  auth: connect(seodraftConnector),
  description:
    "seodraft SEO workspace: business profile, evidence bank, topic bank with search and AI " +
    "volume, content calendar, article briefs and drafts, the rules check (run_gate), " +
    "approval, and delivery of approved drafts to the site's git repository.",
  url: "https://seodraft.app/mcp",
});
