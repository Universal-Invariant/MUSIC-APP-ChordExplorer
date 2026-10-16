/**
 * Chords: a chord is a root pitch class plus an ordered list of spelled
 * intervals (degrees) above that root. The same pitch set can be expressed
 * by many different formulas — the display layer enumerates them.
 */
import { mod12, normalizeSet } from "../core/pitch.js";
import { parseDegreeToken } from "./intervals.js";
/** All pitch classes sounding in the chord (root included). */
export function chordPCs(ch) {
    return normalizeSet([ch.root, ...ch.intervals.map((i) => mod12(ch.root + i.semitones))]);
}
export function chordBitmask(ch) {
    let m = 1 << mod12(ch.root);
    for (const i of ch.intervals)
        m |= 1 << mod12(ch.root + i.semitones);
    return m;
}
/** Distinct absolute semitone offsets of the chord, including 0 (root). */
export function chordOffsets(ch) {
    return [...new Set([0, ...ch.intervals.map((i) => mod12(i.semitones))])].sort((a, b) => a - b);
}
/** Normalize degree tokens to a set key: sorted unique semitone offsets. */
export function degreesToKey(degrees) {
    const semis = new Set([0]);
    for (const d of degrees) {
        const spec = parseDegreeToken(d);
        if (!spec)
            throw new Error(`bad degree token "${d}"`);
        semis.add(mod12(spec.semitones));
    }
    return [...semis].sort((a, b) => a - b).join(",");
}
const F = (id, quality, degrees, aliases) => {
    const intervals = degrees.map((d) => {
        const spec = parseDegreeToken(d);
        if (!spec)
            throw new Error(`bad degree token "${d}" in formula ${id}`);
        return spec;
    });
    return { id, quality, degrees, aliases, tokenKey: degreesToKey(degrees), intervals };
};
/**
 * Built-in chord qualities. Add entries here (or call registerFormula at
 * runtime) to teach the app new chord types without touching anything else.
 */
export const BUILTIN_FORMULAS = [
    // triads & sevenths
    F("maj", "maj", ["3", "5"], ["", "maj", "M", "major"]),
    F("min", "min", ["b3", "5"], ["m", "min", "minor", "-"]),
    F("dim", "dim", ["b3", "bb5"], ["dim", "o", "\u00B0"]),
    F("aug", "aug", ["3", "#5"], ["aug", "+"]),
    F("sus2", "sus2", ["2", "5"], ["sus2"]),
    F("sus4", "sus4", ["4", "5"], ["sus4", "sus"]),
    F("maj7", "maj", ["3", "5", "7"], ["maj7", "M7", "ma7", "Δ", "jazz"]),
    F("m7", "min", ["b3", "5", "b7"], ["m7", "min7", "-7"]),
    F("dom7", "none", ["3", "5", "b7"], ["7", "dom7"]),
    F("mM7", "min", ["b3", "5", "7"], ["mM7", "mmaj7", "mMaj7", "-maj7"]),
    F("m7b5", "dim", ["b3", "bb5", "b7"], ["m7b5", "\u00F8", "half-dim7", "m7-5"]),
    F("dim7", "dim", ["b3", "bb5", "bb7"], ["dim7", "o7", "\u00B07"]),
    F("maj7s5", "aug", ["3", "#5", "7"], ["maj7#5", "maj7+5", "M7#5"]),
    F("maj7b5", "maj", ["3", "b5", "7"], ["maj7b5", "M7b5"]),
    F("aug7", "aug", ["3", "#5", "b7"], ["7#5", "aug7", "7+"]),
    F("7sus4", "sus4", ["4", "5", "b7"], ["7sus4", "sus4_7"]),
    F("7sus2", "sus2", ["2", "5", "b7"], ["7sus2"]),
    // added-note
    F("add9", "maj", ["3", "5", "9"], ["add9"]),
    F("6", "maj", ["3", "5", "13"], ["6", "maj6"]),
    F("m6", "min", ["b3", "5", "13"], ["m6", "min6"]),
    F("69", "maj", ["3", "5", "13", "9"], ["6/9", "69"]),
    F("addb9", "maj", ["3", "5", "b9"], ["addb9"]),
    F("#5addb13", "aug", ["3", "#5", "b13"], ["#5addb13"]),
    // extended dominants
    F("9", "none", ["3", "5", "b7", "9"], ["9", "dom9"]),
    F("m9", "min", ["b3", "5", "b7", "9"], ["m9", "min9"]),
    F("M9", "maj", ["3", "5", "7", "9"], ["maj9", "M9"]),
    F("11", "none", ["3", "5", "b7", "9", "11"], ["11"]),
    F("13", "none", ["3", "5", "b7", "9", "13"], ["13"]),
    F("7b9", "none", ["3", "5", "b7", "b9"], ["7b9"]),
    F("7#9", "none", ["3", "5", "b7", "#9"], ["7#9", "7haz"]),
    F("7b13", "none", ["3", "5", "b7", "b13"], ["7b13"]),
    F("7#11", "none", ["3", "5", "b7", "#11"], ["7#11", "7lyd", "acoustic"]),
    F("7b5", "none", ["3", "b5", "b7"], ["7b5"]),
    F("7#5b9", "aug", ["3", "#5", "b7", "b9"], ["7#5b9", "7+ b9"]),
    F("7b9#5", "aug", ["3", "#5", "b7", "b9"], ["7b9#5"]),
    F("7b9b5", "none", ["3", "b5", "b7", "b9"], ["7b9b5"]),
    F("7alt", "none", ["3", "b7", "b9", "#9", "#11", "b13"], ["7alt", "7super"]),
    // extended maj/min
    F("maj7#11", "maj", ["3", "5", "7", "#11"], ["maj7#11", "M7#11", "lydian"]),
    F("maj7#9", "maj", ["3", "5", "7", "#9"], ["maj7#9"]),
    F("maj7b9", "maj", ["3", "5", "7", "b9"], ["maj7b9"]),
    F("maj7b13", "maj", ["3", "5", "7", "b13"], ["maj7b13"]),
    F("maj9#11", "maj", ["3", "5", "7", "9", "#11"], ["maj9#11", "M9#11"]),
    F("maj7#9#11", "maj", ["3", "5", "7", "#9", "#11"], ["maj7#9#11", "M7#9#11"]),
    F("maj7#5#11", "aug", ["3", "#5", "7", "#11"], ["maj7#5#11"]),
    F("m11", "min", ["b3", "5", "b7", "9", "11"], ["m11", "min11"]),
    F("m7b9", "min", ["b3", "5", "b7", "b9"], ["m7b9"]),
    F("mM7#5", "min", ["b3", "#5", "7"], ["mM7#5"]),
    F("mM7b5", "min", ["b3", "b5", "7"], ["mM7b5"]),
    F("dimM7", "dim", ["b3", "bb5", "bb7"], ["dimM7", "oM7"]), // enharmonic alias of dim7; kept for symbol round-trip
    F("7b9sus", "sus4", ["4", "5", "b7", "b9"], ["7b9sus4"]),
];
// De-dupe identical pitch content so lookups are deterministic. The FIRST
// entry for a given tone-set wins as the canonical formula.
const seenDeg = new Map();
for (const f of BUILTIN_FORMULAS) {
    if (!seenDeg.has(f.tokenKey))
        seenDeg.set(f.tokenKey, f);
}
const formulaRegistry = new Map(seenDeg);
const byId = new Map(BUILTIN_FORMULAS.map((f) => [f.id, f]));
export function registerFormula(entry) {
    byId.set(entry.id, entry);
    if (!formulaRegistry.has(entry.tokenKey))
        formulaRegistry.set(entry.tokenKey, entry);
}
export function lookupFormulaByDegrees(degrees) {
    return formulaRegistry.get(degreesToKey(degrees));
}
export function lookupFormulaByKey(tokenKey) {
    return formulaRegistry.get(tokenKey);
}
export function allFormulas() {
    return [...byId.values()];
}
/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */
/** Build a chord from a root name and degree tokens (validated, de-duped). */
export function makeChord(root, degreeTokens, source, rootName) {
    const bySemi = new Map();
    for (const t of degreeTokens) {
        const spec = parseDegreeToken(t);
        if (!spec)
            throw new Error(`bad degree token "${t}"`);
        const s = mod12(spec.semitones);
        if (!bySemi.has(s))
            bySemi.set(s, spec);
    }
    const intervals = [...bySemi.values()];
    const known = lookupFormulaByKey(degreesToKey(degreeTokens));
    return { root, intervals, quality: known?.quality ?? "none", source, rootName };
}
/** Catalog formula for a chord's pitch content, if known. */
export function formulaForChord(ch) {
    const key = chordOffsets(ch).join(",");
    return lookupFormulaByKey(key);
}
/** Catalog formula id for a chord (pitch-set match), if known. */
export function formulaIdOf(ch) {
    return formulaForChord(ch)?.id;
}
/** The scale-degree index (1-based) a diatonic chord is built on, when it fits. */
export function degreeOfChordInScale(ch, scaleRoot, scalePCsOrdered) {
    const rootIdx = scalePCsOrdered.indexOf(mod12(ch.root));
    if (rootIdx < 0)
        return null;
    return rootIdx + 1;
}
/** Invert a slash chord: X/Y -> chord with Y as bass but X's tones. */
export function withBass(ch, bass) {
    return { ...ch, bass };
}
export function slashPCs(s) {
    return normalizeSet([...chordPCs(s.upper), s.bass]);
}
//# sourceMappingURL=chord.js.map