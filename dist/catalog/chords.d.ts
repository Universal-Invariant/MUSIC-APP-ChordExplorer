/**
 * Chord catalog: which chord formulas are considered "interesting" for
 * harmonization / reverse lookup, plus their display aliases. Extend by
 * pushing entries or calling registerFormula in theory/chord.ts.
 */
import { FormulaEntry } from "../theory/chord.js";
export interface ChordCatalogOptions {
    /** maximum number of non-root tones a chord may have (default 6) */
    maxTones?: number;
    /** restrict to these formula ids (default: everything registered) */
    includeIds?: string[];
    /** skip formula ids (e.g. exotic ones you do not want enumerated) */
    excludeIds?: string[];
}
/** Formulas usable when enumerating candidate chords over a scale. */
export declare function catalogChordFormulas(opts?: ChordCatalogOptions): FormulaEntry[];
/** The classic diatonic seventh-chord qualities per degree of a parent scale. */
export declare const DIATONIC_SEVENTHS: Record<string, string[]>;
