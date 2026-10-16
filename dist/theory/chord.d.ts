/**
 * Chords: a chord is a root pitch class plus an ordered list of spelled
 * intervals (degrees) above that root. The same pitch set can be expressed
 * by many different formulas — the display layer enumerates them.
 */
import { PitchClass } from "../core/pitch.js";
import { IntervalSpec } from "./intervals.js";
import { Letter, Spelling } from "./spelling.js";
export type Quality = "maj" | "min" | "dim" | "aug" | "sus2" | "sus4" | "none";
export interface ChordFormula {
    /** degree tokens relative to root, e.g. ["7","3","5","b7","#9"] or compact aliases like "m7b5" */
    tokens: string[];
}
export interface Chord {
    root: PitchClass;
    /** ordered interval specs above the root (root itself excluded) */
    intervals: IntervalSpec[];
    quality: Quality;
    /** original symbol text, kept for round-tripping / display fallback */
    source?: string;
    /** spelled root as entered (e.g. "Eb"); falls back to pc name when absent */
    rootName?: string;
    /** slash bass pitch class when the symbol was X/Y */
    bass?: PitchClass;
}
/** All pitch classes sounding in the chord (root included). */
export declare function chordPCs(ch: Chord): PitchClass[];
export declare function chordBitmask(ch: Chord): number;
/** Distinct absolute semitone offsets of the chord, including 0 (root). */
export declare function chordOffsets(ch: Chord): number[];
export interface FormulaEntry {
    /** canonical token string, e.g. "maj7", "m7b5", "dom7b9" */
    id: string;
    quality: Quality;
    /** degree tokens relative to root */
    degrees: string[];
    /** common display suffixes recognized by the parser (longest first) */
    aliases: string[];
    /** normalized key: sorted unique semitone offsets, e.g. "0,3,7,10" */
    tokenKey: string;
    /** parsed interval specs above the root */
    intervals: IntervalSpec[];
}
/** Normalize degree tokens to a set key: sorted unique semitone offsets. */
export declare function degreesToKey(degrees: string[]): string;
/**
 * Built-in chord qualities. Add entries here (or call registerFormula at
 * runtime) to teach the app new chord types without touching anything else.
 */
export declare const BUILTIN_FORMULAS: FormulaEntry[];
export declare function registerFormula(entry: FormulaEntry): void;
export declare function lookupFormulaByDegrees(degrees: string[]): FormulaEntry | undefined;
export declare function lookupFormulaByKey(tokenKey: string): FormulaEntry | undefined;
export declare function allFormulas(): FormulaEntry[];
/** Build a chord from a root name and degree tokens (validated, de-duped). */
export declare function makeChord(root: PitchClass, degreeTokens: string[], source?: string, rootName?: string): Chord;
/** Catalog formula for a chord's pitch content, if known. */
export declare function formulaForChord(ch: Chord): FormulaEntry | undefined;
/** Catalog formula id for a chord (pitch-set match), if known. */
export declare function formulaIdOf(ch: Chord): string | undefined;
/** The scale-degree index (1-based) a diatonic chord is built on, when it fits. */
export declare function degreeOfChordInScale(ch: Chord, scaleRoot: PitchClass, scalePCsOrdered: PitchClass[]): number | null;
/** Invert a slash chord: X/Y -> chord with Y as bass but X's tones. */
export declare function withBass(ch: Chord, bass: PitchClass): Chord & {
    bass: PitchClass;
};
export interface SlashChord {
    upper: Chord;
    bass: PitchClass;
}
export declare function slashPCs(s: SlashChord): PitchClass[];
export { Letter };
export type { Spelling };
