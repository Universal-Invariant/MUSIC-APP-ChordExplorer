/**
 * Intervals: generic (letter distance) + specific (semitones), names, and
 * shorthand used inside chord formulas ("3", "b7", "#11", "bb7"...).
 */
import { mod12 } from "../core/pitch.js";
export interface IntervalSpec {
    /** semitones, may exceed an octave for compound degrees (e.g. 18 for #11) */
    semitones: number;
    /** generic size minus one: 0 = unison, 2 = third, 10 = thirteenth, 17 = eleventh-compound... */
    generic: number;
}
/** Reduce a generic size to its simple class (0..6) and octave displacement. */
export declare function reduceGeneric(generic: number): {
    simple: number;
    octaves: number;
};
export declare function intervalName(spec: IntervalSpec): string;
/**
 * Parse a degree token from a chord formula, e.g. "b9", "#11", "bb7", "x5", "13".
 * Returns null when the token is not a degree (callers handle keywords like "add"/"sus").
 */
export declare function parseDegreeToken(token: string): IntervalSpec | null;
/** Degree label (relative to root) for display, e.g. 4 -> "b3" given semitone 3. */
export declare function degreeLabel(semitones: number, generic: number): string;
export { mod12 };
