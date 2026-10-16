/**
 * Note spelling: letter + accidental. Kept separate from pitch-class math so
 * display layers can be swapped without touching theory.
 */
import { PitchClass } from "../core/pitch.js";
export type Letter = "C" | "D" | "E" | "F" | "G" | "A" | "B";
/** A spelled note: letter with an arbitrary (normalized) accidental offset. */
export interface Spelling {
    letter: Letter;
    /** semitone alteration: -2 bb, -1 b, 0 natural, +1 #, +2 x */
    accidental: number;
}
export declare const LETTERS: Letter[];
export declare function spellingPC(n: Spelling): PitchClass;
export declare function makeSpelling(letter: Letter, accidental?: number): Spelling;
/** Pretty-print an accidental count. */
export declare function accidentalText(acc: number): string;
export declare function formatSpelling(n: Spelling): string;
/** Parse things like "C", "F#", "Bb", "Ebx". Returns null on failure. */
export declare function parseSpelling(text: string): Spelling | null;
/** All plausible spellings of a pitch class (letters whose base is within ±2). */
export declare function spellingsOf(pc: PitchClass): Spelling[];
export declare function bestSpelling(pc: PitchClass): Spelling;
