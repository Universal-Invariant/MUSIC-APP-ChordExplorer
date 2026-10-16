/**
 * Intervals: generic (letter distance) + specific (semitones), names, and
 * shorthand used inside chord formulas ("3", "b7", "#11", "bb7"...).
 */
import { mod12 } from "../core/pitch.js";
const QUALITY_BY_DELTA = new Map([
    ["-2", "diminished"], ["-1", "minor"], ["0", "perfect"], ["+1", "augmented"], ["+2", "doubly augmented"],
]);
const QUALITY_BY_DELTA_IMPERFECT = new Map([
    ["-2", "diminished"], ["-1", "minor"], ["0", "major"], ["+1", "augmented"], ["+2", "doubly augmented"],
]);
const GENERIC_NAME = ["unison", "second", "third", "fourth", "fifth", "sixth", "seventh"];
const PERFECT_GENERIC = new Set([0, 3, 5, 6]); // 1,4,8,11 reduce to P classes
/** Reduce a generic size to its simple class (0..6) and octave displacement. */
export function reduceGeneric(generic) {
    const octaves = Math.floor(generic / 7);
    return { simple: generic - octaves * 7, octaves };
}
export function intervalName(spec) {
    const { simple, octaves } = reduceGeneric(spec.generic);
    const baseSemitones = spec.semitones - octaves * 12;
    const isPerfect = PERFECT_GENERIC.has(simple);
    const natural = isPerfect ? [0, 5, 7][simple === 0 ? 0 : simple === 3 ? 1 : 2] ?? 0
        : { 1: 2, 2: 4, 4: 9 }[simple] ?? 0;
    const delta = baseSemitones - natural;
    const qual = (isPerfect ? QUALITY_BY_DELTA : QUALITY_BY_DELTA_IMPERFECT).get(String(delta)) ?? "?";
    const prefix = isPerfect ? "P" : qual === "major" ? "M" : qual === "minor" ? "m" : qual === "augmented" ? "A" : qual === "diminished" ? "d" : "";
    const gname = GENERIC_NAME[simple] ?? `${simple + 1}`;
    const comp = octaves > 0 ? `+${octaves}oct` : "";
    return `${prefix}${gname}${comp} (${baseSemitones}st)`;
}
/**
 * Parse a degree token from a chord formula, e.g. "b9", "#11", "bb7", "x5", "13".
 * Returns null when the token is not a degree (callers handle keywords like "add"/"sus").
 */
export function parseDegreeToken(token) {
    const m = /^([#b!x]*|\u266F*|\u266D*)(\d{1,2})$/.exec(token.trim());
    if (!m)
        return null;
    const accText = m[1];
    const num = parseInt(m[2], 10);
    if (num < 1 || num > 21)
        return null;
    let acc = 0;
    for (const c of accText) {
        if (c === "#" || c === "!" || c === "\u266F")
            acc += 1;
        else if (c === "b" || c === "\u266D")
            acc -= 1;
        else if (c === "x")
            acc += 2;
    }
    const generic = num - 1;
    const { simple } = reduceGeneric(generic);
    const octaves = Math.floor(generic / 7);
    const naturalSimple = [0, 2, 4, 5, 7, 9, 11][simple];
    return { semitones: naturalSimple + acc + octaves * 12, generic };
}
/** Degree label (relative to root) for display, e.g. 4 -> "b3" given semitone 3. */
export function degreeLabel(semitones, generic) {
    const { simple, octaves } = reduceGeneric(generic);
    const naturalSimple = [0, 2, 4, 5, 7, 9, 11][simple];
    const base = semitones - octaves * 12;
    const delta = base - naturalSimple;
    const acc = delta === 1 ? "#" : delta === -1 ? "b" : delta === 2 ? "x" : delta === -2 ? "bb" : delta > 0 ? "#".repeat(delta) : "b".repeat(-delta);
    return `${acc}${simple + 1 + octaves * 7}`;
}
export { mod12 };
//# sourceMappingURL=intervals.js.map