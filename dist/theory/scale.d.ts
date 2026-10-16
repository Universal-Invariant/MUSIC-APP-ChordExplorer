/**
 * Scales: a scale is an ORDERED step pattern rooted on a pitch class.
 * Modes are rotations; the catalog stores parent scales plus named modes.
 */
import { PitchClass } from "../core/pitch.js";
import { Spelling } from "./spelling.js";
export interface ScaleDef {
    /** machine id, e.g. "harmonicMinor" */
    id: string;
    name: string;
    /** short abbreviation used in analysis output, e.g. "hm", "phrydom" */
    abbr: string;
    /** semitone step pattern starting at degree 1 */
    steps: number[];
    /** spelled degrees relative to root (length == steps.length) */
    degrees?: Spelling[];
    /** description / provenance, e.g. "mode 5 of harmonic minor" */
    note?: string;
}
export interface ScaleInstance {
    def: ScaleDef;
    root: PitchClass;
    /** spelled tonic as entered (e.g. "F#"); used for exact degree spelling */
    rootName?: string;
}
/** Absolute intervals from root for each degree. */
export declare function scaleIntervals(def: ScaleDef): number[];
/** Pitch classes of a scale instance (root included). */
export declare function scalePCs(inst: ScaleInstance): PitchClass[];
export declare function scaleBitmask(inst: ScaleInstance): number;
/** True when every chord tone is a member of the scale. */
export declare function containsChord(inst: ScaleInstance, chordPCs: Iterable<PitchClass>): boolean;
/** How many chord tones the scale supplies (for partial-match ranking). */
export declare function overlapCount(inst: ScaleInstance, chordPCs: Iterable<PitchClass>): number;
/** Build an anonymous scale definition from any step pattern. */
export declare function makeScale(steps: number[], name?: string): ScaleDef;
/** The mode of `parent` whose tonic sits `offset` semitones above the parent root. */
export declare function modeStepsOf(parentSteps: number[], offset: number): number[];
