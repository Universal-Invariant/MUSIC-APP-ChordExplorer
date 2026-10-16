import { Spelling } from "../theory/spelling.js";
import { ScaleDef } from "../theory/scale.js";
export interface ParentScaleEntry {
    id: string;
    name: string;
    abbr: string;
    steps: number[];
    degrees: Spelling[];
}
export declare const PARENT_SCALES: ParentScaleEntry[];
export interface ModeEntry {
    /** parent scale id */
    parent: string;
    /** 1-based degree of the parent the mode starts on */
    degree: number;
    id: string;
    name: string;
    abbr: string;
    note?: string;
}
export declare const MODE_TABLE: ModeEntry[];
export declare const EXTRA_SCALES: ScaleDef[];
/** Semitone offset from parent root to the tonic of mode `degree` (1-based). */
export declare function modeOffset(parentSteps: number[], degree: number): number;
/** All scale definitions known to the app, keyed by id. */
export declare function buildScaleCatalog(): Map<string, ScaleDef>;
export declare const SCALE_CATALOG: Map<string, ScaleDef>;
/** Lookup helper tolerant of aliases/abbreviations. */
export declare function findScale(idOrAbbr: string): ScaleDef | undefined;
/** Transpose root helper re-exported for convenience. */
export declare function rootOf(rootName: number): number;
