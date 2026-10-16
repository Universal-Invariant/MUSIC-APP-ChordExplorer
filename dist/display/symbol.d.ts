/**
 * Symbol renderer: Chord -> many equivalent expressions.
 * Strategy pattern: register ExpressionStrategy objects to add new ways of
 * naming a chord (slash reinterpretations, re-rootings, ...) without touching
 * the core. The renderer never guesses spelling — the caller supplies a
 * NoteNameCtx built from the winning scale/mode context.
 */
import { PitchClass } from "../core/pitch.js";
import { Spelling } from "../theory/spelling.js";
export interface NoteNameCtx {
    /** preferred spelling per pitch class, chosen by the caller */
    spellings: Map<PitchClass, Spelling>;
    /**
     * Optional exact chord-tone spellings (root + every degree of one chord).
     * Strategies that label degrees (direct symbol) consult this first so a
     * chord always renders with its own true spelling, e.g. Fmaj7b9 — never a
     * heuristic respelling like "F bbbbbbb9".
     */
    chordTones?: RenderedChord & {
        spellings: Map<PitchClass, Spelling>;
    };
}
/** Chord whose spelled degrees override generic guesses in a context. */
export declare function ctxForChord(base: NoteNameCtx, ch: RenderedChord, spellings: Map<PitchClass, Spelling>): NoteNameCtx;
export interface RenderedChord {
    root: PitchClass;
    /** intervals above root; semitones may be compound (#11 = 18) */
    degrees: {
        semitones: number;
        generic: number;
        pc?: PitchClass;
    }[];
    bass?: PitchClass;
}
export interface ExpressionStrategy {
    id: string;
    name: string;
    describe(ch: RenderedChord, ctx: NoteNameCtx): string[];
}
export declare function noteName(pc: PitchClass, ctx: NoteNameCtx): string;
/**
 * Compact jazz-style suffix computed purely from interval content:
 * triad quality + seventh + extensions/alterations.
 */
export declare function suffixFromDegrees(ch: RenderedChord): string;
/** Exact symbol derived from the entered formula, e.g. "Fmaj7#9#11". */
export declare const directSymbol: ExpressionStrategy;
/** Interpreted shorthand ("Caug/B" style), computed from interval content. */
export declare const jazzSymbol: ExpressionStrategy;
/**
 * Slash forms: X/Y where Y is any chord tone other than the root.
 * Surfaces relations like AmM7/F or Cmaj7#5/B directly from the set.
 */
export declare const slashExpressions: ExpressionStrategy;
/**
 * Re-rooting: try every chord tone as root and re-spell the rest against it.
 * Produces alternative names for the same pitch set (e.g. {B,C,E,G#} also
 * reads as Bmaj7#11(no5)... shown only when the result is well-formed).
 */
export declare const reRooted: ExpressionStrategy;
export declare const DEFAULT_STRATEGIES: ExpressionStrategy[];
export declare class SymbolRenderer {
    private strategies;
    constructor(strategies?: ExpressionStrategy[]);
    addStrategy(s: ExpressionStrategy): this;
    removeStrategy(id: string): this;
    listStrategies(): {
        id: string;
        name: string;
    }[];
    renderAll(ch: RenderedChord, ctx: NoteNameCtx): {
        strategy: string;
        text: string;
    }[];
    renderByStrategy(strategyId: string, ch: RenderedChord, ctx: NoteNameCtx): string[];
}
