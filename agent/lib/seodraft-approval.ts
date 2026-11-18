/**
 * Bare seodraft tool names that pause for a human approve/deny button before they run.
 *
 * @remarks
 * - `always`: the call records or carries out the human's decision (approving an article, the
 *   profile or the content map, adding to the approved map, retiring, writing to the site's
 *   repository), or it can spend the user's DataForSEO balance. Each paid tool names its price in
 *   its description, and seodraft enforces its own per-run and 24h ceilings; the approval puts the
 *   spend in front of the person before it happens.
 * - `confirm`: the tool is a free dry run unless called with `confirm: true`, so only the
 *   confirming call is gated. `start_site_audit` is one: its dry run states the cost and who pays,
 *   and the confirming call starts the audit.
 *
 * Not gated on purpose: `site_audit_status` advances an audit one paid step per call, but every
 * step is charged against the estimate and the per-audit ceiling the person already approved with
 * `start_site_audit`, and the audit is polled every 20 to 30 seconds, so a button per poll would
 * make it unusable. Every other tool (reads, drafting with `upsert_post`, `run_gate`, scheduling,
 * proposing a map with `submit_content_map`, translation links) runs without a prompt.
 *
 * seodraft's MCP tool annotations can't replace this map: they mark every status change as
 * `destructiveHint`, including `upsert_post` and `run_gate`, so gating on them would prompt on
 * every draft save.
 */
export const APPROVAL_REQUIRED_TOOLS: Readonly<
  Record<string, "always" | "confirm">
> = {
  add_cluster_topics: "always",
  add_topics: "always",
  approve_content_map: "always",
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
  start_site_audit: "confirm",
  suggest_topics: "always",
};

/**
 * Decide whether one seodraft tool call needs a person's approval.
 *
 * @remarks
 * eve hands a connection's approval policy the qualified tool name (`seodraft__approve_post`), so
 * the connection prefix is stripped before the lookup in {@link APPROVAL_REQUIRED_TOOLS}. The
 * policy sees only the model's input, which is where `confirm` lives.
 *
 * @param call - The tool call being approved.
 * @param call.toolName - The qualified or bare tool name.
 * @param call.toolInput - The model's input for the call.
 * @returns `"user-approval"` to pause for a button, `"not-applicable"` to run without one.
 */
export const seodraftApproval = ({
  toolName,
  toolInput,
}: {
  readonly toolInput?: unknown;
  readonly toolName: string;
}): "user-approval" | "not-applicable" => {
  const rule = APPROVAL_REQUIRED_TOOLS[toolName.split("__").at(-1) ?? ""];
  const confirmed =
    typeof toolInput === "object" &&
    toolInput !== null &&
    "confirm" in toolInput &&
    toolInput.confirm === true;
  return rule === "always" || (rule === "confirm" && confirmed)
    ? "user-approval"
    : "not-applicable";
};
