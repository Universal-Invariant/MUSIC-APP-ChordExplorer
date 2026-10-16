export interface ChordRelationship {
    parentScaleId: string;
    fromFormula: string;
    toFormula: string;
    /** ascending root motion in semitones */
    rootMotion: number;
    fromModeAbbr: string;
    toModeAbbr: string;
}
type Row = [string, string, string, number, string, string];
export declare const RELATIONSHIP_ROWS: Row[];
export declare function relationships(): ChordRelationship[];
/** Curated matches for an exact (from,to,motion) triple. */
export declare function lookupRelationship(fromFormula: string, toFormula: string, rootMotion: number): ChordRelationship[];
/**
 * Verify a curated row against the actual scale catalog: both chord formulas
 * must be diatonic to the parent family at degrees matching the mode path.
 * Returns a list of human-readable problems (empty = consistent).
 */
export declare function validateRelationshipRow(r: ChordRelationship): string[];
/** Validate every curated row; returns a map of row index -> problems. */
export declare function validateRelationshipCatalog(): Map<number, string[]>;
export declare function modeIdForAbbr(abbr: string): string | undefined;
export {};
