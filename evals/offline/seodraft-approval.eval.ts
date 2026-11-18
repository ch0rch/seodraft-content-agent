import { defineEval } from "eve/evals";
import { equals } from "eve/evals/expect";
import { seodraftApproval } from "../../agent/lib/seodraft-approval.js";

/**
 * The seodraft approval policy, checked directly: no agent turn, no model, no seodraft call.
 */
export default defineEval({
  description:
    "seodraft gates human acts and paid calls, and only the confirming call of a dry-run tool.",
  test(t) {
    const decide = (toolName: string, toolInput: unknown = {}) =>
      seodraftApproval({ toolInput, toolName });

    t.check(decide("seodraft__approve_post"), equals("user-approval"));
    t.check(decide("seodraft__approve_content_map"), equals("user-approval"));
    t.check(decide("seodraft__add_cluster_topics"), equals("user-approval"));
    t.check(decide("research_topic"), equals("user-approval"));

    t.check(decide("seodraft__start_site_audit"), equals("not-applicable"));
    t.check(
      decide("seodraft__start_site_audit", { confirm: true }),
      equals("user-approval")
    );
    t.check(
      decide("seodraft__merge_topics", { confirm: "true" }),
      equals("not-applicable")
    );

    t.check(decide("seodraft__site_audit_status"), equals("not-applicable"));
    t.check(decide("seodraft__upsert_post"), equals("not-applicable"));
    t.check(decide("seodraft__run_gate"), equals("not-applicable"));
  },
});
