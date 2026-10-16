/**
 * Chord catalog: which chord formulas are considered "interesting" for
 * harmonization / reverse lookup, plus their display aliases. Extend by
 * pushing entries or calling registerFormula in theory/chord.ts.
 */
import { allFormulas } from "../theory/chord.js";
/** Formulas usable when enumerating candidate chords over a scale. */
export function catalogChordFormulas(opts = {}) {
    const maxTones = opts.maxTones ?? 6;
    let list = allFormulas().filter((f) => f.degrees.length + 1 <= maxTones);
    if (opts.includeIds)
        list = list.filter((f) => opts.includeIds.includes(f.id));
    if (opts.excludeIds)
        list = list.filter((f) => !opts.excludeIds.includes(f.id));
    return list;
}
/** The classic diatonic seventh-chord qualities per degree of a parent scale. */
export const DIATONIC_SEVENTHS = {
    major: ["maj7", "m7", "m7", "maj7", "dom7", "m7", "m7b5"],
    harmonicMinor: ["mM7", "m7b5", "maj7s5", "m7", "dom7", "maj7", "dim7"],
    melodicMinor: ["mM7", "m7", "maj7s5", "7#11", "dom7", "m7b5", "7alt"],
    harmonicMajor: ["maj7", "m7b5", "m7", "mM7", "7b9", "maj7s5", "dim7"],
};
//# sourceMappingURL=chords.js.map