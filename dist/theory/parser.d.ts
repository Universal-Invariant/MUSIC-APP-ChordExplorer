/**
 * Symbol parser: text -> Chord. Handles "AmM7", "Fmaj7#9#11", "Gm7/C",
 * "Cadd9/E", "B7b9", "Csus4", unicode accidentals, etc.
 */
import { PitchClass } from "../core/pitch.js";
import { Letter } from "../theory/spelling.js";
import { Chord, FormulaEntry } from "../theory/chord.js";
export interface ParseResult {
    ok: boolean;
    chord?: Chord;
    bass?: PitchClass;
    formula?: FormulaEntry;
    errors: string[];
}
export declare function parseChordSymbol(text: string, formulaEntries: FormulaEntry[]): ParseResult;
/** Convenience: parse just a note name to a pitch class. */
export declare function parseNote(text: string): PitchClass | null;
export type { Letter };
