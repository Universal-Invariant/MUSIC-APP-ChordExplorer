/**
 * Relationship catalog: the curated "scale / from-chord / to-chord / root
 * motion / mode path" table. This is data, not logic — add rows freely and
 * `lookupRelationship` plus the UI's reference browser pick them up.
 */
import { findScale, PARENT_SCALES, ParentScaleEntry } from "./scales.js";
import { allFormulas, FormulaEntry } from "../theory/chord.js";
import { areRotations, mod12, stepsToIntervals } from "../core/pitch.js";

export interface ChordRelationship {
  parentScaleId: string;   // display name of the family, e.g. "Harmonic minor"
  fromFormula: string;     // chord formula id relative to its own root, e.g. "dom7b9"
  toFormula: string;
  /** ascending root motion in semitones */
  rootMotion: number;
  fromModeAbbr: string;    // e.g. "phrydom"
  toModeAbbr: string;      // e.g. "hm"
}

type Row = [string, string, string, number, string, string];

const R = (parent: string, from: string, to: string, motion: number, fm: string, tm: string): Row =>
  [parent, from, to, motion, fm, tm];

export const RELATIONSHIP_ROWS: Row[] = [
  // ---- Major (modes of the diatonic scale) ----
  R("Major", "maj7", "m7", 2, "Ion", "Dor"),
  R("Major", "maj7", "m7", 4, "Ion", "Phr"),
  R("Major", "maj7", "maj7", 5, "Ion", "Lyd"),
  R("Major", "maj7", "dom7", 7, "Ion", "Mix"),
  R("Major", "maj7", "m7", 9, "Ion", "Aeo"),
  R("Major", "maj7", "m7b5", 11, "Ion", "Loc"),
  R("Major", "m7", "maj7", 10, "Dor", "Ion"),
  R("Major", "m7", "m7", 2, "Dor", "Phr"),
  R("Major", "m7", "maj7", 3, "Dor", "Lyd"),
  R("Major", "m7", "dom7", 5, "Dor", "Mix"),
  R("Major", "m7", "m7", 7, "Dor", "Aeo"),
  R("Major", "m7", "m7b5", 9, "Dor", "Loc"),
  R("Major", "m7", "maj7", 1, "Phr", "Lyd"),
  R("Major", "m7", "dom7", 3, "Phr", "Mix"),
  R("Major", "m7", "m7", 5, "Phr", "Aeo"),
  R("Major", "m7", "m7b5", 7, "Phr", "Loc"),
  R("Major", "m7", "maj7", 8, "Phr", "Ion"),
  R("Major", "m7", "m7", 10, "Phr", "Dor"),
  R("Major", "maj7", "dom7", 2, "Lyd", "Mix"),
  R("Major", "maj7", "m7", 4, "Lyd", "Aeo"),
  R("Major", "maj7", "m7b5", 6, "Lyd", "Loc"),
  R("Major", "maj7", "maj7", 7, "Lyd", "Ion"),
  R("Major", "maj7", "m7", 9, "Lyd", "Dor"),
  R("Major", "maj7", "m7", 11, "Lyd", "Phr"),
  R("Major", "dom7", "m7", 2, "Mix", "Aeo"),
  R("Major", "dom7", "m7b5", 4, "Mix", "Loc"),
  R("Major", "dom7", "maj7", 5, "Mix", "Ion"),
  R("Major", "dom7", "m7", 7, "Mix", "Dor"),
  R("Major", "dom7", "m7", 9, "Mix", "Phr"),
  R("Major", "dom7", "maj7", 10, "Mix", "Lyd"),
  R("Major", "m7", "m7b5", 2, "Aeo", "Loc"),
  R("Major", "m7", "maj7", 3, "Aeo", "Ion"),
  R("Major", "m7", "m7", 5, "Aeo", "Dor"),
  R("Major", "m7", "m7", 7, "Aeo", "Phr"),
  R("Major", "m7", "maj7", 8, "Aeo", "Lyd"),
  R("Major", "m7", "dom7", 10, "Aeo", "Mix"),
  R("Major", "m7b5", "maj7", 1, "Loc", "Ion"),
  R("Major", "m7b5", "m7", 3, "Loc", "Dor"),
  R("Major", "m7b5", "m7", 5, "Loc", "Phr"),
  R("Major", "m7b5", "maj7", 6, "Loc", "Lyd"),
  R("Major", "m7b5", "dom7", 8, "Loc", "Mix"),
  R("Major", "m7b5", "m7", 10, "Loc", "Aeo"),

  // ---- Harmonic minor ----
  R("Harmonic minor", "mM7", "m7b5", 2, "hm", "loc6"),
  R("Harmonic minor", "mM7", "maj7s5", 3, "hm", "ion#5"),
  R("Harmonic minor", "mM7", "m7", 5, "hm", "dor#4"),
  R("Harmonic minor", "mM7", "dom7", 7, "hm", "phrydom"),
  R("Harmonic minor", "mM7", "maj7", 8, "hm", "lyd#9"),
  R("Harmonic minor", "mM7", "dim7", 11, "hm", "ult"),
  R("Harmonic minor", "m7b5", "mM7", 10, "loc6", "hm"),
  R("Harmonic minor", "m7b5", "maj7s5", 1, "loc6", "ion#5"),
  R("Harmonic minor", "m7b5", "m7", 3, "loc6", "dor#4"),
  R("Harmonic minor", "m7b5", "dom7", 5, "loc6", "phrydom"),
  R("Harmonic minor", "m7b5", "maj7", 6, "loc6", "lyd#9"),
  R("Harmonic minor", "m7b5", "dim7", 9, "loc6", "ult"),
  R("Harmonic minor", "maj7s5", "mM7", 9, "ion#5", "hm"),
  R("Harmonic minor", "maj7s5", "m7b5", 11, "ion#5", "loc6"),
  R("Harmonic minor", "maj7s5", "m7", 2, "ion#5", "dor#4"),
  R("Harmonic minor", "maj7s5", "dom7", 4, "ion#5", "phrydom"),
  R("Harmonic minor", "maj7s5", "maj7", 5, "ion#5", "lyd#9"),
  R("Harmonic minor", "maj7s5", "dim7", 8, "ion#5", "ult"),
  R("Harmonic minor", "m7", "mM7", 7, "dor#4", "hm"),
  R("Harmonic minor", "m7", "m7b5", 9, "dor#4", "loc6"),
  R("Harmonic minor", "m7", "maj7s5", 10, "dor#4", "ion#5"),
  R("Harmonic minor", "m7", "dom7", 2, "dor#4", "phrydom"),
  R("Harmonic minor", "m7", "maj7", 3, "dor#4", "lyd#9"),
  R("Harmonic minor", "m7", "dim7", 6, "dor#4", "ult"),
  R("Harmonic minor", "dom7", "mM7", 5, "phrydom", "hm"),
  R("Harmonic minor", "dom7", "m7b5", 7, "phrydom", "loc6"),
  R("Harmonic minor", "dom7", "maj7s5", 8, "phrydom", "ion#5"),
  R("Harmonic minor", "dom7", "m7", 10, "phrydom", "dor#4"),
  R("Harmonic minor", "dom7", "maj7", 1, "phrydom", "lyd#9"),
  R("Harmonic minor", "dom7", "dim7", 4, "phrydom", "ult"),
  R("Harmonic minor", "maj7", "mM7", 4, "lyd#9", "hm"),
  R("Harmonic minor", "maj7", "m7b5", 6, "lyd#9", "loc6"),
  R("Harmonic minor", "maj7", "maj7s5", 7, "lyd#9", "ion#5"),
  R("Harmonic minor", "maj7", "m7", 9, "lyd#9", "dor#4"),
  R("Harmonic minor", "maj7", "dom7", 11, "lyd#9", "phrydom"),
  R("Harmonic minor", "maj7", "dim7", 3, "lyd#9", "ult"),
  R("Harmonic minor", "dim7", "mM7", 1, "ult", "hm"),
  R("Harmonic minor", "dim7", "m7b5", 3, "ult", "loc6"),
  R("Harmonic minor", "dim7", "maj7s5", 4, "ult", "ion#5"),
  R("Harmonic minor", "dim7", "m7", 6, "ult", "dor#4"),
  R("Harmonic minor", "dim7", "dom7", 8, "ult", "phrydom"),
  R("Harmonic minor", "dim7", "maj7", 9, "ult", "lyd#9"),

  // ---- Melodic minor ----
  R("Melodic minor", "mM7", "m7", 2, "mm", "phr6"),
  R("Melodic minor", "mM7", "maj7s5", 3, "mm", "lydaug"),
  R("Melodic minor", "mM7", "7#11", 5, "mm", "lyddom"),
  R("Melodic minor", "mM7", "dom7", 7, "mm", "mixb6"),
  R("Melodic minor", "mM7", "m7b5", 9, "mm", "loc2"),
  R("Melodic minor", "mM7", "7alt", 11, "mm", "alt"),
  R("Melodic minor", "m7", "mM7", 10, "phr6", "mm"),
  R("Melodic minor", "m7", "maj7s5", 1, "phr6", "lydaug"),
  R("Melodic minor", "m7", "7#11", 3, "phr6", "lyddom"),
  R("Melodic minor", "m7", "dom7", 5, "phr6", "mixb6"),
  R("Melodic minor", "m7", "m7b5", 7, "phr6", "loc2"),
  R("Melodic minor", "m7", "7alt", 9, "phr6", "alt"),
  R("Melodic minor", "maj7s5", "mM7", 9, "lydaug", "mm"),
  R("Melodic minor", "maj7s5", "m7", 11, "lydaug", "phr6"),
  R("Melodic minor", "maj7s5", "7#11", 2, "lydaug", "lyddom"),
  R("Melodic minor", "maj7s5", "dom7", 4, "lydaug", "mixb6"),
  R("Melodic minor", "maj7s5", "m7b5", 6, "lydaug", "loc2"),
  R("Melodic minor", "maj7s5", "7alt", 8, "lydaug", "alt"),
  R("Melodic minor", "7#11", "mM7", 7, "lyddom", "mm"),
  R("Melodic minor", "7#11", "m7", 9, "lyddom", "phr6"),
  R("Melodic minor", "7#11", "maj7s5", 10, "lyddom", "lydaug"),
  R("Melodic minor", "7#11", "dom7", 2, "lyddom", "mixb6"),
  R("Melodic minor", "7#11", "m7b5", 4, "lyddom", "loc2"),
  R("Melodic minor", "7#11", "7alt", 6, "lyddom", "alt"),
  R("Melodic minor", "dom7", "mM7", 5, "mixb6", "mm"),
  R("Melodic minor", "dom7", "m7", 7, "mixb6", "phr6"),
  R("Melodic minor", "dom7", "maj7s5", 8, "mixb6", "lydaug"),
  R("Melodic minor", "dom7", "7#11", 10, "mixb6", "lyddom"),
  R("Melodic minor", "dom7", "m7b5", 2, "mixb6", "loc2"),
  R("Melodic minor", "dom7", "7alt", 4, "mixb6", "alt"),
  R("Melodic minor", "m7b5", "mM7", 3, "loc2", "mm"),
  R("Melodic minor", "m7b5", "m7", 5, "loc2", "phr6"),
  R("Melodic minor", "m7b5", "maj7s5", 6, "loc2", "lydaug"),
  R("Melodic minor", "m7b5", "7#11", 8, "loc2", "lyddom"),
  R("Melodic minor", "m7b5", "dom7", 10, "loc2", "mixb6"),
  R("Melodic minor", "m7b5", "7alt", 2, "loc2", "alt"),
  R("Melodic minor", "7alt", "mM7", 1, "alt", "mm"),
  R("Melodic minor", "7alt", "m7", 3, "alt", "phr6"),
  R("Melodic minor", "7alt", "maj7s5", 4, "alt", "lydaug"),
  R("Melodic minor", "7alt", "7#11", 6, "alt", "lyddom"),
  R("Melodic minor", "7alt", "dom7", 8, "alt", "mixb6"),
  R("Melodic minor", "7alt", "m7b5", 10, "alt", "loc2"),

  // ---- Harmonic major ----
  R("Harmonic major", "maj7", "m7b5", 2, "ionb6", "dorb5"),
  R("Harmonic major", "maj7", "m7", 4, "ionb6", "phrb4"),
  R("Harmonic major", "maj7", "mM7", 5, "ionb6", "lydb3"),
  R("Harmonic major", "maj7", "7b9", 7, "ionb6", "mixb2"),
  R("Harmonic major", "maj7", "maj7s5", 8, "ionb6", "lydaug#2"),
  R("Harmonic major", "maj7", "dim7", 11, "ionb6", "locbb7"),
  R("Harmonic major", "m7b5", "maj7", 10, "dorb5", "ionb6"),
  R("Harmonic major", "m7b5", "m7", 2, "dorb5", "phrb4"),
  R("Harmonic major", "m7b5", "mM7", 3, "dorb5", "lydb3"),
  R("Harmonic major", "m7b5", "7b9", 5, "dorb5", "mixb2"),
  R("Harmonic major", "m7b5", "maj7s5", 6, "dorb5", "lydaug#2"),
  R("Harmonic major", "m7b5", "dim7", 9, "dorb5", "locbb7"),
  R("Harmonic major", "m7", "maj7", 8, "phrb4", "ionb6"),
  R("Harmonic major", "m7", "m7b5", 10, "phrb4", "dorb5"),
  R("Harmonic major", "m7", "mM7", 1, "phrb4", "lydb3"),
  R("Harmonic major", "m7", "7b9", 3, "phrb4", "mixb2"),
  R("Harmonic major", "m7", "maj7s5", 4, "phrb4", "lydaug#2"),
  R("Harmonic major", "m7", "dim7", 7, "phrb4", "locbb7"),
  R("Harmonic major", "mM7", "maj7", 7, "lydb3", "ionb6"),
  R("Harmonic major", "mM7", "m7b5", 9, "lydb3", "dorb5"),
  R("Harmonic major", "mM7", "m7", 11, "lydb3", "phrb4"),
  R("Harmonic major", "mM7", "7b9", 2, "lydb3", "mixb2"),
  R("Harmonic major", "mM7", "maj7s5", 3, "lydb3", "lydaug#2"),
  R("Harmonic major", "mM7", "dim7", 6, "lydb3", "locbb7"),
  R("Harmonic major", "7b9", "maj7", 5, "mixb2", "ionb6"),
  R("Harmonic major", "7b9", "m7b5", 7, "mixb2", "dorb5"),
  R("Harmonic major", "7b9", "m7", 9, "mixb2", "phrb4"),
  R("Harmonic major", "7b9", "mM7", 10, "mixb2", "lydb3"),
  R("Harmonic major", "7b9", "maj7s5", 1, "mixb2", "lydaug#2"),
  R("Harmonic major", "7b9", "dim7", 4, "mixb2", "locbb7"),
  R("Harmonic major", "maj7s5", "maj7", 4, "lydaug#2", "ionb6"),
  R("Harmonic major", "maj7s5", "m7b5", 6, "lydaug#2", "dorb5"),
  R("Harmonic major", "maj7s5", "m7", 8, "lydaug#2", "phrb4"),
  R("Harmonic major", "maj7s5", "mM7", 9, "lydaug#2", "lydb3"),
  R("Harmonic major", "maj7s5", "7b9", 11, "lydaug#2", "mixb2"),
  R("Harmonic major", "maj7s5", "dim7", 3, "lydaug#2", "locbb7"),
  R("Harmonic major", "dim7", "maj7", 1, "locbb7", "ionb6"),
  R("Harmonic major", "dim7", "m7b5", 3, "locbb7", "dorb5"),
  R("Harmonic major", "dim7", "m7", 5, "locbb7", "phrb4"),
  R("Harmonic major", "dim7", "mM7", 6, "locbb7", "lydb3"),
  R("Harmonic major", "dim7", "7b9", 8, "locbb7", "mixb2"),
  R("Harmonic major", "dim7", "maj7s5", 9, "locbb7", "lydaug#2"),

  // ---- Symmetric families ----
  R("Whole-tone", "aug7", "aug7", 2, "WT", "WT"),
  R("Whole-tone", "aug7", "aug7", 4, "WT", "WT"),
  R("Whole-tone", "aug7", "aug7", 6, "WT", "WT"),
  R("Whole-tone", "aug7", "aug7", 8, "WT", "WT"),
  R("Whole-tone", "aug7", "aug7", 10, "WT", "WT"),
  R("HW diminished", "7b9", "7b9", 3, "HW", "HW"),
  R("HW diminished", "7b9", "7b9", 6, "HW", "HW"),
  R("HW diminished", "7b9", "7b9", 9, "HW", "HW"),
  R("HW diminished", "dim7", "dim7", 3, "HW", "HW"),
  R("HW diminished", "dim7", "dim7", 6, "HW", "HW"),
  R("HW diminished", "dim7", "dim7", 9, "HW", "HW"),
  R("HW diminished", "7b9", "dim7", 1, "HW", "HW"),
  R("HW diminished", "dim7", "7b9", 11, "HW", "HW"),
];

/** Resolve a mode abbreviation to a catalogued scale id (when possible). */
const ABBR_TO_ID = new Map<string, string>();
function initAbbrMap() {
  if (ABBR_TO_ID.size) return;
  for (const [, , , , fm, tm] of RELATIONSHIP_ROWS) {
    for (const abbr of [fm, tm]) {
      if (!ABBR_TO_ID.has(abbr)) {
        const def = findScale(abbr);
        if (def) ABBR_TO_ID.set(abbr, def.id);
      }
    }
  }
}

export function relationships(): ChordRelationship[] {
  initAbbrMap();
  return RELATIONSHIP_ROWS.map(([parentScaleId, fromFormula, toFormula, rootMotion, fromModeAbbr, toModeAbbr]) => ({
    parentScaleId, fromFormula, toFormula, rootMotion, fromModeAbbr, toModeAbbr,
  }));
}

/** Curated matches for an exact (from,to,motion) triple. */
export function lookupRelationship(fromFormula: string, toFormula: string, rootMotion: number): ChordRelationship[] {
  return relationships().filter(
    (r) => r.fromFormula === fromFormula && r.toFormula === toFormula && r.rootMotion === rootMotion,
  );
}

/**
 * Verify a curated row against the actual scale catalog: both chord formulas
 * must be diatonic to the parent family at degrees matching the mode path.
 * Returns a list of human-readable problems (empty = consistent).
 */
export function validateRelationshipRow(r: ChordRelationship): string[] {
  const problems: string[] = [];
  const fm = findScale(r.fromModeAbbr);
  const tm = findScale(r.toModeAbbr);
  if (!fm) problems.push(`unknown mode abbr "${r.fromModeAbbr}"`);
  if (!tm) problems.push(`unknown mode abbr "${r.toModeAbbr}"`);
  if (problems.length) return problems;

  const ff = allFormulas().find((f) => f.id === r.fromFormula);
  const ft = allFormulas().find((f) => f.id === r.toFormula);
  if (!ff) problems.push(`unknown from-formula "${r.fromFormula}"`);
  if (!ft) problems.push(`unknown to-formula "${r.toFormula}"`);
  if (problems.length) return problems;

  // Mode abbrs are rotations of a parent; verify set equality as modes.
  if (!areRotations(fm!.steps, tm!.steps)) {
    problems.push(`modes ${r.fromModeAbbr}/${r.toModeAbbr} are not rotations of one scale`);
  }

  // The "parent scale" column names the family; check both chords are
  // harmonizable on some degree of that family's step pattern.
  const parent = PARENT_BY_DISPLAY.get(r.parentScaleId);
  if (!parent) {
    problems.push(`unknown parent family "${r.parentScaleId}"`);
    return problems;
  }
  const steps = parent.steps;
  const offs = stepsToIntervals(steps); // [0, ...]
  const fitsDegree = (f: FormulaEntry): boolean => {
    for (let deg = 0; deg < steps.length; deg++) {
      const base = offs[deg];
      const chordInts = [0, ...f.intervals.map((i) => i.semitones)].map((s) => mod12(base + s));
      if (chordInts.every((c) => offs.some((o) => mod12(o) === c))) return true;
    }
    return false;
  };
  if (!fitsDegree(ff!)) problems.push(`${r.fromFormula} is not diatonic to ${r.parentScaleId}`);
  if (!fitsDegree(ft!)) problems.push(`${r.toFormula} is not diatonic to ${r.parentScaleId}`);
  return problems;
}

const PARENT_BY_DISPLAY = new Map<string, ParentScaleEntry>(
  PARENT_SCALES.map((p) => [p.name, p]),
);
// relationship rows use short family names ("Major", "Harmonic minor", ...)
PARENT_BY_DISPLAY.set("Major", PARENT_SCALES.find((p) => p.id === "major")!);
PARENT_BY_DISPLAY.set("Whole-tone", PARENT_SCALES.find((p) => p.id === "wholeTone")!);
PARENT_BY_DISPLAY.set("HW diminished", PARENT_SCALES.find((p) => p.id === "halfWhole")!);

/** Validate every curated row; returns a map of row index -> problems. */
export function validateRelationshipCatalog(): Map<number, string[]> {
  const out = new Map<number, string[]>();
  RELATIONSHIP_ROWS.forEach((row, i) => {
    const [parentScaleId, fromFormula, toFormula, rootMotion, fromModeAbbr, toModeAbbr] = row;
    const problems = validateRelationshipRow({
      parentScaleId, fromFormula, toFormula, rootMotion, fromModeAbbr, toModeAbbr,
    });
    if (problems.length) out.set(i, problems);
  });
  return out;
}

export function modeIdForAbbr(abbr: string): string | undefined {
  initAbbrMap();
  return ABBR_TO_ID.get(abbr);
}
