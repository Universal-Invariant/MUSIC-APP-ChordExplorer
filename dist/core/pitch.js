/**
 * Core pitch-class primitives shared by every layer of the app.
 * Everything downstream (theory, catalog, analysis, display, UI) speaks
 * in terms of these types so modules can be swapped independently.
 */
/** Canonical spelling of a note within an octave: C C# D D# ... B */
export const PC_NAMES_SHARP = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];
export const PC_NAMES_FLAT = [
    "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B",
];
/** Normalize any integer to 0..11. */
export function mod12(n) {
    return ((n % 12) + 12) % 12;
}
/** Interval (in semitones, ascending) between two pitch classes. */
export function intervalBetween(a, b) {
    return mod12(b - a);
}
/** Sorted, de-duplicated list of pitch classes. */
export function normalizeSet(pcs) {
    return [...new Set([...pcs].map(mod12))].sort((x, y) => x - y);
}
/** Convert a pitch-class list to a 12-bit membership integer. */
export function toBitmask(pcs) {
    let m = 0;
    for (const p of pcs)
        m |= 1 << mod12(p);
    return m;
}
/** Convert a 12-bit membership integer to sorted pitch classes. */
export function fromBitmask(mask) {
    const out = [];
    for (let i = 0; i < 12; i++)
        if (mask & (1 << i))
            out.push(i);
    return out;
}
/** Rotate an ordered step pattern so it starts on `modeIndex` (0 = parent root). */
export function rotateMode(steps, modeIndex) {
    const n = steps.length;
    const k = ((modeIndex % n) + n) % n;
    return [...steps.slice(k), ...steps.slice(0, k)];
}
/** Absolute intervals (from scale degree 1) derived from a step pattern. */
export function stepsToIntervals(steps) {
    const out = [0];
    let acc = 0;
    for (const s of steps) {
        acc += s;
        out.push(acc);
    }
    return out; // length = steps.length + 1 (last entry is 12)
}
/** Step pattern (semitone gaps) derived from absolute intervals. */
export function intervalsToSteps(intervals) {
    const steps = [];
    for (let i = 1; i < intervals.length; i++)
        steps.push(intervals[i] - intervals[i - 1]);
    const span = intervals[0] + 12 - intervals[intervals.length - 1];
    if (span !== 0)
        steps.push(span);
    return steps;
}
/** True when two patterns are rotations of each other (set-wise / mode-free equality). */
export function areRotations(a, b) {
    if (a.length !== b.length)
        return false;
    const doubled = [...a, ...a].join(",");
    return doubled.includes(b.join(","));
}
//# sourceMappingURL=pitch.js.map