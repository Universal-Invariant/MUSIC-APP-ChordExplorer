/**
 * Scales: a scale is an ORDERED step pattern rooted on a pitch class.
 * Modes are rotations; the catalog stores parent scales plus named modes.
 */
import { mod12, normalizeSet, rotateMode, toBitmask } from "../core/pitch.js";
/** Absolute intervals from root for each degree. */
export function scaleIntervals(def) {
    const out = [0];
    let acc = 0;
    for (const s of def.steps)
        out.push((acc += s));
    return out.slice(0, -1); // drop the octave repeat
}
/** Pitch classes of a scale instance (root included). */
export function scalePCs(inst) {
    return scaleIntervals(inst.def).map((i) => mod12(inst.root + i));
}
export function scaleBitmask(inst) {
    return toBitmask(scalePCs(inst));
}
/** True when every chord tone is a member of the scale. */
export function containsChord(inst, chordPCs) {
    const mask = scaleBitmask(inst);
    for (const p of normalizeSet(chordPCs))
        if (!(mask & (1 << p)))
            return false;
    return true;
}
/** How many chord tones the scale supplies (for partial-match ranking). */
export function overlapCount(inst, chordPCs) {
    const mask = scaleBitmask(inst);
    let n = 0;
    for (const p of normalizeSet(chordPCs))
        if (mask & (1 << p))
            n++;
    return n;
}
/** Build an anonymous scale definition from any step pattern. */
export function makeScale(steps, name = "custom") {
    const sum = steps.reduce((a, b) => a + b, 0);
    if (sum !== 12)
        throw new Error(`scale steps must sum to 12 (got ${sum}): [${steps}]`);
    return { id: `custom:${steps.join("-")}`, name, abbr: name, steps };
}
/** The mode of `parent` whose tonic sits `offset` semitones above the parent root. */
export function modeStepsOf(parentSteps, offset) {
    // find rotation index whose cumulative interval equals offset
    let acc = 0;
    for (let i = 0; i < parentSteps.length; i++) {
        if (acc === mod12(offset))
            return rotateMode(parentSteps, i);
        acc += parentSteps[i];
    }
    throw new Error(`offset ${offset} is not a degree of [${parentSteps}]`);
}
