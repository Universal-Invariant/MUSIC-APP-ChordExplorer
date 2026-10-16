/**
 * Spelling engine: choose note names for a pitch-class set so that symbols
 * read correctly in context. Strategy: anchor on the chord root (or scale
 * tonic), then walk letter space minimizing accidental distance per semitone
 * step, with flat-preference bias for flat-leaning collections.
 */
import { PitchClass } from "../core/pitch.js";
import { Spelling } from "./spelling.js";
export interface SpellOptions {
    /** force these spellings first (e.g. the chord root) */
    anchors?: Map<PitchClass, Spelling>;
    /** global preference when ambiguous */
    preferFlats?: boolean;
    /**
     * Anchor pc whose letter defines the reference point for generic-distance
     * scoring. Degrees are then spelled by letter distance from this anchor:
     * semitone 1 above an F-root becomes Gb (a second), never Abb (a doubly-
     * diminished unison). Defaults to the lowest-numbered anchor.
     */
    anchorRoot?: PitchClass;
}
/**
 * Spell a collection of pitch classes. Returns pc -> Spelling.
 * When `anchorRoot` + exact `degrees` are supplied the spelling is derived
 * deterministically from interval theory (one letter per degree, correct
 * accidentals). Otherwise a heuristic walk assigns nearest-letter spellings.
 */
export declare function spellSet(pcs: PitchClass[], opts?: SpellOptions & {
    degrees?: {
        semitones: number;
        generic: number;
    }[];
}): Map<PitchClass, Spelling>;
/** Verify spelling consistency: returns pitch classes whose spelling matches. */
export declare function verifySpellings(map: Map<PitchClass, Spelling>): boolean;
