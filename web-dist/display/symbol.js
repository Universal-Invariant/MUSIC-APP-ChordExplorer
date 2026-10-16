/**
 * Symbol renderer: Chord -> many equivalent expressions.
 * Strategy pattern: register ExpressionStrategy objects to add new ways of
 * naming a chord (slash reinterpretations, re-rootings, ...) without touching
 * the core. The renderer never guesses spelling — the caller supplies a
 * NoteNameCtx built from the winning scale/mode context.
 */
import { mod12, normalizeSet } from "../core/pitch.js";
import { degreeLabel } from "../theory/intervals.js";
import { accidentalText } from "../theory/spelling.js";
/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */
export function noteName(pc, ctx) {
    const s = ctx.spellings.get(mod12(pc));
    return s ? s.letter + accidentalText(s.accidental) : "?";
}
/** Order in which simple generics are considered when labeling content. */
const STACK_ORDER = [0, 2, 4, 6]; // 1 3 5 7
/**
 * Compact jazz-style suffix computed purely from interval content:
 * triad quality + seventh + extensions/alterations.
 */
export function suffixFromDegrees(ch) {
    const bySemi = new Map(); // simple semitone -> generic
    for (const d of ch.degrees) {
        const s = mod12(d.semitones);
        if (s === 0)
            continue;
        if (!bySemi.has(s))
            bySemi.set(s, d.generic);
    }
    const third = bySemi.has(3) ? "m" : bySemi.has(4) ? "M" : null;
    const fifthDim = bySemi.has(6);
    const fifthAug = bySemi.has(8);
    const seventh = bySemi.has(10) ? "m7" : bySemi.has(11) ? "M7" : null;
    let base = "";
    if (third === null) {
        if (bySemi.has(2))
            base = "sus2";
        else if (bySemi.has(5))
            base = "sus4";
        else
            base = "5";
    }
    else {
        base = third === "m" ? "m" : "";
        if (fifthAug)
            base += third === "m" ? "M7#5".slice(0, 0) + "aug" : "aug";
        else if (fifthDim)
            base += "b5";
    }
    if (base !== "" && !["sus2", "sus4", "5"].includes(base)) {
        if (seventh === "m7") {
            if (base === "m")
                base = "m7";
            else if (base === "")
                base = "7";
            else if (base.endsWith("aug"))
                base = "7#5";
            else if (base.endsWith("b5"))
                base = base === "mb5" ? "m7b5" : "7b5";
            else
                base += "7";
        }
        else if (seventh === "M7") {
            if (base === "m")
                base = "mM7";
            else if (base === "")
                base = "maj7";
            else if (base.endsWith("aug"))
                base = "maj7#5";
            else if (base.endsWith("b5"))
                base = base === "mb5" ? "mM7b5" : "maj7b5";
            else
                base += "M7";
        }
    }
    if (third === "m" && !fifthDim && !fifthAug && seventh === null && bySemi.size === 1)
        base = "m";
    // extensions & alterations beyond the stack
    const extras = [];
    let hasAdd9 = false;
    for (const [semi, generic] of bySemi) {
        if (STACK_ORDER.includes(generic % 7) && generic < 7)
            continue; // covered by base
        const label = degreeLabel(semi + Math.floor(generic / 7) * 12, generic);
        if (generic === 8 && semi === 2 && !seventh && third) {
            hasAdd9 = true;
            continue;
        }
        extras.push(label);
    }
    extras.sort((a, b) => num(a) - num(b));
    const addPart = hasAdd9 ? "add9" : "";
    return base + addPart + extras.join("");
}
function num(token) {
    return parseInt(token.replace(/[^0-9]/g, ""), 10) || 0;
}
/* ------------------------------------------------------------------ */
/* built-in strategies                                                 */
/* ------------------------------------------------------------------ */
/** Exact symbol derived from the entered formula, e.g. "Fmaj7#9#11". */
export const directSymbol = {
    id: "direct",
    name: "Direct symbol",
    describe(ch, ctx) {
        const parts = ch.degrees.map((d) => degreeLabel(d.semitones, d.generic)).join("");
        return [noteName(ch.root, ctx) + parts];
    },
};
/** Interpreted shorthand ("Caug/B" style), computed from interval content. */
export const jazzSymbol = {
    id: "jazz",
    name: "Jazz shorthand",
    describe(ch, ctx) {
        return [noteName(ch.root, ctx) + suffixFromDegrees(ch)];
    },
};
/**
 * Slash forms: X/Y where Y is any chord tone other than the root.
 * Surfaces relations like AmM7/F or Cmaj7#5/B directly from the set.
 */
export const slashExpressions = {
    id: "slash",
    name: "Slash forms",
    describe(ch, ctx) {
        const pcs = normalizeSet([ch.root, ...ch.degrees.map((d) => mod12(ch.root + d.semitones))]);
        const upper = noteName(ch.root, ctx) + suffixFromDegrees(ch);
        const out = [];
        for (const bass of pcs) {
            if (mod12(bass) === mod12(ch.root))
                continue;
            out.push(`${upper}/${noteName(bass, ctx)}`);
        }
        return out;
    },
};
/**
 * Re-rooting: try every chord tone as root and re-spell the rest against it.
 * Produces alternative names for the same pitch set (e.g. {B,C,E,G#} also
 * reads as Bmaj7#11(no5)... shown only when the result is well-formed).
 */
export const reRooted = {
    id: "reroot",
    name: "Re-rooted interpretations",
    describe(ch, ctx) {
        const all = normalizeSet([ch.root, ...ch.degrees.map((d) => mod12(ch.root + d.semitones))]);
        const out = [];
        for (const newRoot of all) {
            if (newRoot === mod12(ch.root))
                continue;
            const degs = all
                .filter((p) => p !== newRoot)
                .map((p) => ({ semitones: mod12(p - newRoot), generic: genericGuess(mod12(p - newRoot)) }))
                .sort((a, b) => a.semitones - b.semitones);
            const sym = noteName(newRoot, ctx) + suffixFromDegrees({ root: newRoot, degrees: degs });
            if (!sym.includes("?"))
                out.push(sym);
        }
        return out;
    },
};
/** Best-guess generic size for an un-spelled semitone (for re-root mode). */
function genericGuess(semitone) {
    switch (semitone) {
        case 1: return 1; // b9/b2
        case 2: return 1; // 9/2
        case 3: return 2; // b3
        case 4: return 2; // 3
        case 5: return 3; // 4/11
        case 6: return 4; // b5
        case 7: return 4; // 5
        case 8: return 4; // #5
        case 9: return 5; // 6/13
        case 10: return 6; // b7
        case 11: return 6; // 7
        default: return 0;
    }
}
export const DEFAULT_STRATEGIES = [directSymbol, jazzSymbol, slashExpressions, reRooted];
/* ------------------------------------------------------------------ */
/* renderer                                                            */
/* ------------------------------------------------------------------ */
export class SymbolRenderer {
    constructor(strategies = DEFAULT_STRATEGIES) {
        this.strategies = [...strategies];
    }
    addStrategy(s) { this.strategies.push(s); return this; }
    removeStrategy(id) {
        this.strategies = this.strategies.filter((s) => s.id !== id);
        return this;
    }
    listStrategies() {
        return this.strategies.map((s) => ({ id: s.id, name: s.name }));
    }
    renderAll(ch, ctx) {
        const out = [];
        for (const s of this.strategies) {
            for (const text of s.describe(ch, ctx))
                out.push({ strategy: s.id, text });
        }
        return dedupe(out);
    }
    renderByStrategy(strategyId, ch, ctx) {
        const s = this.strategies.find((x) => x.id === strategyId);
        return s ? s.describe(ch, ctx) : [];
    }
}
function dedupe(items) {
    const seen = new Set();
    return items.filter((i) => (seen.has(i.text) ? false : (seen.add(i.text), true)));
}
//# sourceMappingURL=symbol.js.map