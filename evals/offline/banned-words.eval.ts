import { defineEval } from "eve/evals";
import { equals } from "eve/evals/expect";
import { findBannedWords } from "../../agent/lib/banned-words.js";

/**
 * The banned-words matcher, checked directly: no agent turn and no model.
 */
export default defineEval({
  description: "findBannedWords matches whole words, case-insensitively.",
  test(t) {
    t.check(
      findBannedWords("linkedin", "We LEVERAGE synergy to ship faster."),
      equals(["synergy", "leverage"])
    );
    t.check(
      findBannedWords("linkedin", "The leveraged buyout closed."),
      equals([])
    );
    t.check(
      findBannedWords("linkedin", "Export reports in one click."),
      equals([])
    );
  },
});
