/**
 * Public API facade. The UI (or a Rust port, or tests) should only talk to
 * this module — internals stay free to move around.
 */
import { PitchClass } from "../core/pitch.js";
import { Chord } from "../theory/chord.js";
import { ScaleInstance } from "../theory/scale.js";
import { ParseResult } from "../theory/parser.js";
import { SymbolRenderer, NoteNameCtx } from "../display/symbol.js";
import { InterpolationResult, ProgressionAnalysis, ReverseMatch, ScalePoolOptions, TwoScaleOption } from "./engine.js";
import { ChordRelationship } from "../catalog/relationships.js";
export interface TransitionReport {
    fromSymbol: string;
    toSymbol: string;
    rootMotion: number;
    /** bass pitch class when the input was a slash chord (informational) */
    fromBass?: PitchClass;
    toBass?: PitchClass;
    singleScaleOptions: InterpolationResult[];
    twoScaleFallback: TwoScaleOption[];
    curatedMatches: ChordRelationship[];
}
export interface ChordToneView {
    pc: PitchClass;
    name: string;
    degree: string;
    semitones: number;
    generic?: number;
}
export interface ChordView {
    root: PitchClass;
    rootName: string;
    quality: string;
    formulaId?: string;
    tones: ChordToneView[];
    bass?: PitchClass;
    bassName?: string;
    bitmask: number;
    expressions: {
        strategy: string;
        text: string;
    }[];
}
export interface ScaleDegreeView {
    degree: number;
    pc: PitchClass;
    offset: number;
    name: string;
    label: string;
}
export interface ScaleView {
    def: ScaleInstance["def"];
    root: PitchClass;
    rootName: string;
    degrees: ScaleDegreeView[];
    bitmask: number;
}
export declare class HarmonicApp {
    readonly renderer: SymbolRenderer;
    private formulaEntries;
    constructor();
    parse(text: string): ParseResult;
    /** Parse a progression: comma- or bar-separated chords ("Am7, D7, Gmaj7"). */
    parseProgression(text: string): {
        chords: Chord[];
        errors: string[];
    };
    /** Build a spelling context anchored on the given roots. */
    nameContext(anchorRoots: PitchClass[], preferFlats?: boolean): NoteNameCtx;
    /** Spelling context for one specific chord: exact degree spellings from root. */
    chordContext(ch: Chord, preferFlats?: boolean): NoteNameCtx;
    expressions(ch: Chord, ctx?: NoteNameCtx): {
        strategy: string;
        text: string;
    }[];
    scaleNotes(inst: ScaleInstance, ctx?: NoteNameCtx): string[];
    /**
     * Everything a chord panel needs to render one chord: spelled note names in
     * ascending order from the root, degree labels, and slash-bass info.
     */
    chordView(ch: Chord, bass?: PitchClass): ChordView;
    /** Everything a scale panel needs: ordered spelled degrees with labels. */
    scaleView(inst: ScaleInstance): ScaleView;
    /** Build a chord straight from a scale view by stacking degrees (skip-selections allowed). */
    chordFromScaleDegrees(view: ScaleView, degreeIndices: number[], rootIndex?: number): Chord;
    private spelledName;
    interpolate(x: Chord, y: Chord, opts?: ScalePoolOptions): InterpolationResult[];
    twoScaleFallback(x: Chord, y: Chord, opts?: ScalePoolOptions): TwoScaleOption[];
    reverse(scales: ScaleInstance[], rootMotion: number): ReverseMatch[];
    progression(chords: Chord[]): ProgressionAnalysis;
    /**
     * Rich per-transition report including curated relationship matches.
     * The `bass` fields let slash-chord input (AmM7/F, Caug/B) participate in
     * set-wise matching without losing the bass tone.
     */
    transitionReport(from: Chord, to: Chord, opts?: ScalePoolOptions & {
        fromBass?: PitchClass;
        toBass?: PitchClass;
    }): TransitionReport;
    /**
     * Set-wise membership test honoring a slash bass: are all sounding tones of
     * (chord + optional bass) inside the scale instance?
     */
    containsWithBass(inst: ScaleInstance, ch: Chord, bass?: PitchClass): boolean;
    scales(): import("../theory/scale.js").ScaleDef[];
    findScale(idOrAbbr: string): import("../theory/scale.js").ScaleDef | undefined;
    relationshipTable(): ChordRelationship[];
}
export type { Chord, InterpolationResult, ReverseMatch, TwoScaleOption, ChordRelationship };
