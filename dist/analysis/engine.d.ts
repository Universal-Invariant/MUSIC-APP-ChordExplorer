import { Chord } from "../theory/chord.js";
import { ScaleDef, ScaleInstance } from "../theory/scale.js";
import { ChordCatalogOptions } from "../catalog/chords.js";
import { ChordRelationship } from "../catalog/relationships.js";
export interface ScalePoolOptions {
    /** restrict to these scale ids (default: whole catalog) */
    includeIds?: string[];
    excludeIds?: string[];
}
export declare function scaleDefs(opts?: ScalePoolOptions): ScaleDef[];
export type Naturalness = "strong" | "good" | "partial";
export interface FitDetail {
    /** scale degree (1-based) each chord is built on, when its root is in scale */
    fromDegree: number | null;
    toDegree: number | null;
    /** how many chord tones land on a strong beat position (root/3rd/5th/7th stack) */
    fromTernaryHits: number;
    toTernaryHits: number;
}
export interface InterpolationResult {
    scale: ScaleInstance;
    /** semitones from result scale root to each chord root */
    fromOffset: number;
    toOffset: number;
    coversBoth: boolean;
    coverageFrom: number;
    coverageTo: number;
    naturalness: Naturalness;
    score: number;
    detail: FitDetail;
}
export declare function rankKey(r: InterpolationResult): number;
/**
 * All scales containing both chords (single-scale interpolation), then
 * partial-cover scales as fallback, ranked naturally-first.
 */
export declare function findInterpolatingScales(x: Chord, y: Chord, opts?: ScalePoolOptions): InterpolationResult[];
export interface TwoScaleOption {
    first: ScaleInstance;
    second: ScaleInstance;
    sharedTones: number;
    note: string;
}
/** When no single scale covers both, list natural scale pairs. */
export declare function findTwoScaleOptions(x: Chord, y: Chord, opts?: ScalePoolOptions, limit?: number): TwoScaleOption[];
export interface ChordCandidate {
    chord: Chord;
    /** display symbol (root name + formula alias), always defined */
    label: string;
    /** spelled degrees relative to scale root, 1-based */
    degree: number;
    /** diatonic-ish label like "maj7 on degree 5" */
    description: string;
}
export interface ReverseMatch {
    from: ChordCandidate;
    to: ChordCandidate;
    rootMotion: number;
    scale: ScaleInstance;
}
/** Default sharp-side display name for a pitch class (context-free fallback). */
export declare function pcToNoteName(pc: number): string;
/**
 * Given one or two scales and an ascending root motion, enumerate chord pairs
 * (from, to) such that both chords fit the scale(s). With two scales, X must
 * fit the first and Y the second (mirroring the interpolation use-case).
 */
export declare function findChordsForScale(scales: ScaleInstance[], rootMotion: number, chordOpts?: ChordCatalogOptions): ReverseMatch[];
export interface TransitionAnalysis {
    index: number;
    from: Chord;
    to: Chord;
    rootMotion: number;
    singleScaleOptions: InterpolationResult[];
    twoScaleFallback: TwoScaleOption[];
    /** curated relationship rows matching this exact (formula, formula, motion) */
    curatedMatches: ChordRelationship[];
}
export interface ProgressionAnalysis {
    chords: Chord[];
    transitions: TransitionAnalysis[];
}
export declare function analyzeProgression(chords: Chord[], opts?: ScalePoolOptions): ProgressionAnalysis;
/** Formula id of a chord candidate (for relationship-catalog cross-checks). */
export declare function candidateFormulaId(c: ChordCandidate): string | undefined;
