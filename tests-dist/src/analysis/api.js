/**
 * Public API facade. The UI (or a Rust port, or tests) should only talk to
 * this module — internals stay free to move around.
 */
import { intervalBetween, mod12, normalizeSet } from "../core/pitch.js";
import { chordBitmask, chordPCs, allFormulas, formulaForChord, makeChord } from "../theory/chord.js";
import { findScale, SCALE_CATALOG } from "../catalog/scales.js";
import { scaleBitmask, scaleIntervals } from "../theory/scale.js";
import { parseChordSymbol } from "../theory/parser.js";
import { spellSet } from "../theory/speller.js";
import { accidentalText, LETTERS } from "../theory/spelling.js";
import { accidentalLabel, degreeLabelSafe } from "../theory/intervals.js";
import { SymbolRenderer, ctxForChord } from "../display/symbol.js";
import { parseSpelling, bestSpelling, formatSpelling } from "../theory/spelling.js";
import { analyzeProgression, findChordsForScale, findInterpolatingScales, findTwoScaleOptions, } from "./engine.js";
import { lookupRelationship, relationships } from "../catalog/relationships.js";
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** semitone offsets of scale-degree 1..7 on the natural (white-key) letters */
const NATURAL_SEMI = [0, 2, 4, 5, 7, 9, 11];
function scaleIntervalsOf(def) {
    return scaleIntervals(def);
}
/** Accidentals beyond ±2 are notated enharmonically; keep labels compact. */
function clampAccidental(a) {
    return a > 2 ? 2 : a < -2 ? -2 : a;
}
export class HarmonicApp {
    renderer = new SymbolRenderer();
    formulaEntries;
    constructor() {
        this.formulaEntries = allFormulas();
    }
    /* ---------------- input ---------------- */
    parse(text) {
        return parseChordSymbol(text, this.formulaEntries);
    }
    /** Parse a progression: comma- or bar-separated chords ("Am7, D7, Gmaj7"). */
    parseProgression(text) {
        let parts;
        if (text.includes(","))
            parts = text.split(",");
        else if (/\|/.test(text))
            parts = text.split("|");
        else
            parts = text.split(/\s+(?=[A-Ga-g][#b]?)/);
        const chords = [];
        const errors = [];
        for (const p of parts) {
            const r = this.parse(p);
            if (r.ok && r.chord)
                chords.push(r.chord);
            else
                errors.push(...r.errors.map((e) => `"${p.trim()}": ${e}`));
        }
        return { chords, errors };
    }
    /* ---------------- display ---------------- */
    /** Build a spelling context anchored on the given roots. */
    nameContext(anchorRoots, preferFlats = false) {
        const pcs = anchorRoots.length ? anchorRoots : [0];
        const map = spellSet(pcs, { preferFlats });
        return { spellings: map };
    }
    /** Spelling context for one specific chord: exact degree spellings from root. */
    chordContext(ch, preferFlats = false) {
        const rootSp = parseSpelling(ch.rootName ?? "") ?? bestSpelling(ch.root);
        const degrees = ch.intervals.map((i) => ({ semitones: i.semitones, generic: i.generic }));
        const names = normalizeSet([ch.root, ...degrees.map((d) => mod12(ch.root + d.semitones))]);
        const anchors = new Map([[mod12(ch.root), rootSp]]);
        // Authored/parsed exact degrees take priority over heuristic respellings.
        for (const ed of ch.exactDegrees ?? [])
            anchors.set(mod12(ch.root + ed.spec.semitones), ed.spelling);
        const map = spellSet(names, { anchors, anchorRoot: mod12(ch.root), degrees, preferFlats });
        const rc = {
            root: ch.root,
            degrees: degrees.map((d) => ({ ...d, pc: mod12(ch.root + d.semitones) })),
            bass: ch.bass,
        };
        return ctxForChord({ spellings: map }, rc, map);
    }
    expressions(ch, ctx) {
        const rc = {
            root: ch.root,
            degrees: ch.intervals.map((i) => ({ semitones: i.semitones, generic: i.generic, pc: mod12(ch.root + i.semitones) })),
            bass: ch.bass,
        };
        const own = this.chordContext(ch);
        const merged = ctx ? { ...ctx, chordTones: own.chordTones } : own;
        return this.renderer.renderAll(rc, merged);
    }
    scaleNotes(inst, ctx) {
        const pcs = inst.def.steps.map((_, i) => mod12(inst.root + inst.def.steps.slice(0, i).reduce((a, b) => a + b, 0)));
        const c = ctx ?? this.nameContext(pcs);
        return pcs.map((p) => {
            const s = c.spellings.get(p);
            return s ? `${formatSpelling(s)}` : "?";
        });
    }
    /* ---------------- visualization support (panels) ---------------- */
    /**
     * Everything a chord panel needs to render one chord: spelled note names in
     * ascending order from the root, degree labels, and slash-bass info.
     */
    chordView(ch, bass, ctxOverride) {
        const effBass = bass ?? ch.bass;
        // Exact spelling anchored on the chord's own root + degree specs.
        // When a scale context is supplied (ctxOverride), merge its spellings so
        // re-spelled tones (e.g. Fmaj7#9 re-read as Ab/F) use the parent scale's
        // names instead of heuristic respellings like "Abbbb".
        const ctx = ctxOverride ? { ...this.chordContext(ch), spellings: new Map([...ctxOverride.spellings, ...this.chordContext(ch).spellings]) } : this.chordContext(ch);
        // Authored exact degrees (e.g. "#9" over F) label directly; anything else
        // falls back to interval arithmetic which is now octave-safe.
        const exactBySemi = new Map();
        for (const ed of ch.exactDegrees ?? []) {
            exactBySemi.set(mod12(ed.spec.semitones), accidentalLabel(ed.spelling.accidental) + String(ed.spec.generic + 1));
        }
        const tones = ch.intervals.map((i) => {
            const pc = mod12(ch.root + i.semitones);
            let label;
            if (exactBySemi.has(mod12(i.semitones))) {
                label = exactBySemi.get(mod12(i.semitones));
            }
            else {
                // Never trust a raw scale/diatonic spelling as a *degree* label: when
                // the pc is an altered chord tone (e.g. G# above F labelled via a
                // context that spells it Abbbb), the accidental count explodes.
                // Compute the delta from the natural generic size and clamp it so a
                // degree can carry at most a double accidental.
                label = degreeLabelSafe(i.semitones, i.generic);
            }
            return { semitones: mod12(i.semitones), generic: i.generic, pc, name: this.spelledName(ctx, pc), degree: label };
        }).sort((a, b) => a.semitones - b.semitones);
        const formula = formulaForChord(ch);
        // Render expressions in the same merged context so slash/re-root forms
        // use scale-consistent note names (no "F bbbbbbb9"-style artifacts).
        const rcView = {
            root: ch.root,
            degrees: ch.intervals.map((i) => ({ semitones: i.semitones, generic: i.generic, pc: mod12(ch.root + i.semitones) })),
            bass: effBass,
        };
        const viewCtx = { ...ctx, chordTones: ctx.chordTones };
        const symbolTexts = this.renderer.renderAll(rcView, viewCtx).slice(0, 8);
        return {
            root: ch.root,
            rootName: this.spelledName(ctx, mod12(ch.root)),
            quality: ch.quality,
            formulaId: formula?.id,
            tones: [{ pc: mod12(ch.root), name: this.spelledName(ctx, mod12(ch.root)), degree: "1", semitones: 0 }, ...tones],
            bass: effBass,
            bassName: effBass !== undefined ? this.spelledName(ctx, effBass) : undefined,
            bitmask: chordBitmask(ch) | (effBass !== undefined ? (1 << mod12(effBass)) : 0),
            expressions: symbolTexts,
        };
    }
    /** Everything a scale panel needs: ordered spelled degrees with labels. */
    scaleView(inst) {
        const offs = scaleIntervalsOf(inst.def);
        const pcs = offs.map((o) => mod12(inst.root + o));
        // Exact spelling: each degree's letter is offset by its generic step count
        // from the tonic's letter (degree i -> letter index +i), accidentals follow.
        const rootSp = parseSpelling(inst.rootName ?? "") ?? bestSpelling(inst.root);
        const rootLetterIdx = LETTERS.indexOf(rootSp.letter);
        const map = new Map();
        map.set(mod12(inst.root), rootSp);
        offs.forEach((o, i) => {
            if (i === 0)
                return;
            const pc = mod12(inst.root + o);
            const letter = LETTERS[(rootLetterIdx + i) % 7];
            const base = LETTER_PC[letter];
            let acc = mod12(pc - base);
            if (acc > 6)
                acc -= 12;
            if (!map.has(pc))
                map.set(pc, { letter, accidental: acc });
        });
        const ctx = { spellings: map };
        const spelled = inst.def.degrees && inst.def.degrees.length === offs.length ? inst.def.degrees : null;
        const degrees = offs.map((o, i) => {
            const pc = mod12(inst.root + o);
            const sp = map.get(pc);
            return {
                degree: i + 1,
                pc,
                offset: o,
                name: sp.letter + accidentalText(sp.accidental),
                label: typeof spelled?.[i] === "string" ? spelled[i] : `${accidentalLabel(clampAccidental(sp.accidental))}${i + 1}`,
            };
        });
        return {
            def: inst.def,
            root: inst.root,
            rootName: this.spelledName(ctx, mod12(inst.root)),
            degrees,
            bitmask: scaleBitmask(inst),
        };
    }
    /** Build a chord straight from a scale view by stacking degrees (skip-selections allowed). */
    chordFromScaleDegrees(view, degreeIndices, rootIndex = 0) {
        const base = view.degrees[rootIndex];
        const tokens = degreeIndices
            .filter((d) => d !== (rootIndex + 1))
            .map((d) => {
            const deg = view.degrees.find((x) => x.degree === d);
            if (!deg)
                throw new Error(`degree ${d} not in scale`);
            const generic = ((d - (rootIndex + 1)) % view.degrees.length + view.degrees.length) % view.degrees.length + 1;
            const semi = mod12(deg.pc - base.pc);
            const naturalOffset = NATURAL_SEMI[Math.min(generic - 1, 6)] ?? 0;
            const alter = mod12(semi - naturalOffset + 6) - 6;
            const accTxt = accidentalLabel(alter);
            return `${accTxt}${generic > 7 ? generic : generic}`;
        });
        return makeChord(base.pc, tokens.length ? tokens : ["3", "5"], undefined);
    }
    spelledName(ctx, pc) {
        const s = ctx.spellings.get(mod12(pc));
        return s ? s.letter + accidentalText(s.accidental) : "?";
    }
    /* ---------------- analysis ---------------- */
    interpolate(x, y, opts) {
        return findInterpolatingScales(x, y, opts);
    }
    twoScaleFallback(x, y, opts) {
        return findTwoScaleOptions(x, y, opts);
    }
    reverse(scales, rootMotion) {
        return findChordsForScale(scales, rootMotion);
    }
    progression(chords) {
        return analyzeProgression(chords);
    }
    /**
     * Rich per-transition report including curated relationship matches.
     * The `bass` fields let slash-chord input (AmM7/F, Caug/B) participate in
     * set-wise matching without losing the bass tone.
     */
    transitionReport(from, to, opts) {
        const motion = intervalBetween(from.root, to.root);
        const singles = findInterpolatingScales(from, to, opts);
        const ff = formulaForChord(from)?.id;
        const ft = formulaForChord(to)?.id;
        const curated = ff && ft ? lookupRelationship(ff, ft, motion) : [];
        return {
            fromSymbol: from.source ?? "?",
            toSymbol: to.source ?? "?",
            rootMotion: motion,
            fromBass: opts?.fromBass,
            toBass: opts?.toBass,
            singleScaleOptions: singles.filter((s) => s.coversBoth).slice(0, 30),
            twoScaleFallback: singles.some((s) => s.coversBoth) ? [] : findTwoScaleOptions(from, to, opts),
            curatedMatches: curated,
        };
    }
    /**
     * Set-wise membership test honoring a slash bass: are all sounding tones of
     * (chord + optional bass) inside the scale instance?
     */
    containsWithBass(inst, ch, bass) {
        const mask = scaleBitmask(inst);
        for (const p of chordPCs(ch))
            if (!(mask & (1 << p)))
                return false;
        if (bass !== undefined && !(mask & (1 << mod12(bass))))
            return false;
        return true;
    }
    /* ---------------- catalog access ---------------- */
    scales() { return [...SCALE_CATALOG.values()]; }
    findScale(idOrAbbr) { return findScale(idOrAbbr); }
    relationshipTable() { return relationships(); }
}
