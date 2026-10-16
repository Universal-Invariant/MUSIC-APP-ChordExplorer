/**
 * Spelling engine: choose note names for a pitch-class set so that symbols
 * read correctly in context. Strategy: anchor on the chord root (or scale
 * tonic), then walk letter space minimizing accidental distance per semitone
 * step, with flat-preference bias for flat-leaning collections.
 */
import { mod12 } from "../core/pitch.js";
import { LETTERS, spellingPC } from "./spelling.js";
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const FLAT_PREFER = new Set([3, 8, 10]); // Eb, Ab, Bb read better flat
/**
 * Spell a collection of pitch classes. Returns pc -> Spelling.
 * Every pc gets exactly one letter (no duplicate letters is attempted but not
 * guaranteed for chromatic sets — accidentals absorb the rest).
 */
export function spellSet(pcs, opts = {}) {
    const result = new Map();
    const used = new Set();
    const ordered = [...new Set(pcs.map(mod12))];
    // apply anchors
    if (opts.anchors) {
        for (const [pc, sp] of opts.anchors) {
            if (ordered.includes(pc)) {
                result.set(pc, sp);
                used.add(sp.letter);
            }
        }
    }
    const flatsFirst = opts.preferFlats ?? false;
    for (const pc of ordered) {
        if (result.has(pc))
            continue;
        let best = null;
        let bestScore = Infinity;
        for (const letter of LETTERS) {
            let acc = mod12(pc - LETTER_PC[letter] + 6) - 6; // -6..5 -> use nearest
            if (acc > 6)
                acc -= 12;
            else if (acc < -6)
                acc += 12;
            if (Math.abs(acc) > 2)
                continue;
            let score = Math.abs(acc) * 2;
            if (used.has(letter))
                score += 3; // avoid double letters
            const prefersFlat = flatsFirst || FLAT_PREFER.has(pc);
            if (prefersFlat && acc > 0)
                score += 1.5; // nudge toward flats
            if (!prefersFlat && acc < 0 && pc !== 1 && pc !== 6)
                score += 0.5;
            if (score < bestScore) {
                bestScore = score;
                best = { letter, accidental: acc };
            }
        }
        if (!best)
            best = nearestNatural(pc);
        result.set(pc, best);
        used.add(best.letter);
    }
    return result;
}
function nearestNatural(pc) {
    const naturals = [["C", 0], ["D", 2], ["E", 4], ["F", 5], ["G", 7], ["A", 9], ["B", 11]];
    let best = { letter: "C", accidental: 0 };
    let bd = 99;
    for (const [l, b] of naturals) {
        const d = Math.min(mod12(b - pc), mod12(pc - b));
        if (d < bd) {
            bd = d;
            best = { letter: l, accidental: mod12(pc - b + 6) - 6 };
        }
    }
    return best;
}
/** Verify spelling consistency: returns pitch classes whose spelling matches. */
export function verifySpellings(map) {
    for (const [pc, sp] of map)
        if (spellingPC(sp) !== mod12(pc))
            return false;
    return true;
}
//# sourceMappingURL=speller.js.map