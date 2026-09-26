/**
 * Builds a Postgres `to_tsquery` string from a patient's question.
 *
 * `websearch_to_tsquery` ANDs every term, which fails on conversational
 * questions ("can I take my Menopur a bit late tonight?"). We OR the content
 * words instead and let `ts_rank_cd` + a score threshold decide whether the
 * evidence is strong enough — weak evidence means the answer is withheld.
 */

const STOPWORDS = new Set(
  (
    "a an the and or but if then so to of in on at by for with about from into over under is are was were be been being " +
    "i me my mine we our you your it its this that these those am do does did doing have has had can could should would will " +
    "shall may might must what when where which who whom why how there here just also very really bit little much many some any " +
    "okay ok please thanks thank during while hi hello hey tonight today tomorrow now still yet ever again need want know tell get got im ive"
  ).split(" "),
);

/** Patient words → clinic-document words. Keeps retrieval honest without embeddings. */
const SYNONYMS: Record<string, string[]> = {
  shot: ["injection", "inject"],
  shots: ["injection", "inject"],
  jab: ["injection"],
  needle: ["injection", "pen"],
  late: ["missed", "timing", "window"],
  later: ["missed", "timing", "window"],
  early: ["timing", "window"],
  forgot: ["missed"],
  skip: ["missed"],
  fridge: ["refrigerator", "store", "storage"],
  refrigerate: ["refrigerator", "storage"],
  keep: ["store", "storage"],
  mix: ["mixing", "reconstitute", "powder"],
  mixing: ["reconstitute", "powder"],
  travel: ["travel", "storage"],
  bruise: ["bruising", "site"],
  bruising: ["site", "injection"],
  sting: ["stinging", "site"],
  hurts: ["pain"],
  bloated: ["bloating", "swelling"],
  trigger: ["trigger", "ovidrel", "hcg"],
  gonal: ["follitropin"],
  wine: ["alcohol"],
  beer: ["alcohol"],
  drinking: ["alcohol"],
  plane: ["flying", "travel"],
  flight: ["flying", "travel"],
  fly: ["flying", "travel"],
  coffee: ["caffeine"],
  exercise: ["exercise", "activity"],
  workout: ["exercise", "activity"],
  run: ["exercise"],
  sex: ["intercourse"],
  retrieval: ["retrieval", "procedure"],
};

/**
 * Words every clinic document is full of. They are fine for ranking but are
 * not evidence on their own — "Is coffee okay during stimulation?" must not
 * match a passage just because both mention stimulation.
 */
const GENERIC = new Set(
  "stimulation medication medications medicine meds dose doses cycle ivf clinic take taking normal okay safe drink eat use using start feel feeling".split(" "),
);

export function extractTerms(question: string): string[] {
  const words = question
    .toLowerCase()
    // Postgres indexes "Gonal-F" as "gonal" (+ "f"), so normalise to that.
    .replace(/gonal[\s-]?f\b/g, "gonal")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  const out = new Set<string>();
  for (const w of words) {
    out.add(w);
    for (const s of SYNONYMS[w] ?? []) out.add(s.replace(/[^a-z0-9]/g, ""));
  }
  return [...out].slice(0, 16);
}

/** Returns null when nothing searchable is left (e.g. "hi"). */
export function buildTsQuery(question: string): string | null {
  const all = extractTerms(question).filter((t) => /^[a-z0-9]+$/.test(t));
  const specific = all.filter((t) => !GENERIC.has(t));
  const terms = specific.length ? specific : all;
  if (terms.length === 0) return null;
  // Prefix-match only longer words: "tea:*" would match "team".
  return terms.map((t) => (t.length >= 5 ? `${t}:*` : t)).join(" | ");
}

/**
 * Below this rank (ts_rank_cd normalised to 0–1) a passage is not evidence.
 * Tuned on the sample guide set: on-topic passages score 0.6–0.85, single
 * incidental word matches ~0.29.
 */
export const MIN_EVIDENCE_SCORE = 0.25;
/** The offline (no-model) path quotes a passage only above this stricter bar. */
export const MIN_EXTRACTIVE_SCORE = 0.45;
