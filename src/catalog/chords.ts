/**
 * Chord catalog: which chord formulas are considered "interesting" for
 * harmonization / reverse lookup, plus their display aliases. Extend by
 * pushing entries or calling registerFormula in theory/chord.ts.
 */
import { allFormulas, FormulaEntry } from "../theory/chord.js";

export interface ChordCatalogOptions {
  /** maximum number of non-root tones a chord may have (default 6) */
  maxTones?: number;
  /** restrict to these formula ids (default: everything registered) */
  includeIds?: string[];
  /** skip formula ids (e.g. exotic ones you do not want enumerated) */
  excludeIds?: string[];
}

/** Formulas usable when enumerating candidate chords over a scale. */
export function catalogChordFormulas(opts: ChordCatalogOptions = {}): FormulaEntry[] {
  const maxTones = opts.maxTones ?? 6;
  let list = allFormulas().filter((f) => f.degrees.length + 1 <= maxTones);
  if (opts.includeIds) list = list.filter((f) => opts.includeIds!.includes(f.id));
  if (opts.excludeIds) list = list.filter((f) => !opts.excludeIds!.includes(f.id));
  return list;
}

/** The classic diatonic seventh-chord qualities per degree of a parent scale. */
export const DIATONIC_SEVENTHS: Record<string, string[]> = {
  major: ["maj7", "m7", "m7", "maj7", "dom7", "m7", "m7b5"],
  harmonicMinor: ["mM7", "m7b5", "maj7s5", "m7", "dom7", "maj7", "dim7"],
  melodicMinor: ["mM7", "m7", "maj7s5", "7#11", "dom7", "m7b5", "7alt"],
  harmonicMajor: ["maj7", "m7b5", "m7", "mM7", "7b9", "maj7s5", "dim7"],
};
