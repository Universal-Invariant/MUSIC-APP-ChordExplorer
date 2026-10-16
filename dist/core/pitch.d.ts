/**
 * Core pitch-class primitives shared by every layer of the app.
 * Everything downstream (theory, catalog, analysis, display, UI) speaks
 * in terms of these types so modules can be swapped independently.
 */
/** A pitch class: 0..11 (C = 0). */
export type PitchClass = number;
/** Canonical spelling of a note within an octave: C C# D D# ... B */
export declare const PC_NAMES_SHARP: readonly ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export declare const PC_NAMES_FLAT: readonly ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
/** Normalize any integer to 0..11. */
export declare function mod12(n: number): number;
/** Interval (in semitones, ascending) between two pitch classes. */
export declare function intervalBetween(a: PitchClass, b: PitchClass): number;
/** Sorted, de-duplicated list of pitch classes. */
export declare function normalizeSet(pcs: Iterable<PitchClass>): PitchClass[];
/** Convert a pitch-class list to a 12-bit membership integer. */
export declare function toBitmask(pcs: Iterable<PitchClass>): number;
/** Convert a 12-bit membership integer to sorted pitch classes. */
export declare function fromBitmask(mask: number): PitchClass[];
/** Rotate an ordered step pattern so it starts on `modeIndex` (0 = parent root). */
export declare function rotateMode(steps: number[], modeIndex: number): number[];
/** Absolute intervals (from scale degree 1) derived from a step pattern. */
export declare function stepsToIntervals(steps: number[]): number[];
/** Step pattern (semitone gaps) derived from absolute intervals. */
export declare function intervalsToSteps(intervals: number[]): number[];
/** True when two patterns are rotations of each other (set-wise / mode-free equality). */
export declare function areRotations(a: number[], b: number[]): boolean;
