import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";
import { seodraftApproval } from "../lib/seodraft-approval.js";

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
 * seodraft workspace connection (MCP): profile, markets, evidence bank, topic bank, site audit,
 * content map, calendar, article drafts, the deterministic rules check (`run_gate`), approval,
 * and delivery.
 *
 * @remarks
 * Authorization is user-scoped via Vercel Connect: each person signs in to their own seodraft
 * account through a browser consent flow (seodraft's OAuth server supports dynamic client
 * registration, so Connect registers the client itself). The per-user token is resolved before
 * every tool call and never reaches the model; the agent sees exactly the workspaces that
 * account can open. The model finds seodraft's tools with `eve__search` and calls them with
 * `eve__tool`.
 *
 * Which calls pause for a button is decided by {@link seodraftApproval}.
 *
 * @see {@link https://seodraft.app | seodraft}
 * @see {@link https://vercel.com/docs/connect | Vercel Connect}
 */
export default defineMcpClientConnection({
  approval: seodraftApproval,
  auth: connect(seodraftConnector),
  description:
    "seodraft SEO workspace: business profile and markets, evidence bank, topic bank with " +
    "search and AI volume, site audit and content map, content calendar, article briefs and " +
    "drafts, the rules check (run_gate), approval, and delivery of approved drafts to the " +
    "site's repository or CMS.",
  url: "https://seodraft.app/mcp",
});
