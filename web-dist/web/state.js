/**
 * Web state store: framework-free observable app state.
 * Panels subscribe to slices and re-render on change; they never mutate
 * state directly — everything flows through the action methods below.
 */
import { mod12, normalizeSet } from "../core/pitch.js";
import { makeChord } from "../theory/chord.js";
const emptySelection = () => ({ pcs: new Set(), root: null, bass: null });
export class Store {
    constructor(app) {
        this.mode = "interpolate";
        this.timeline = [];
        this.beats = [];
        this.selection = emptySelection();
        this.activeScale = null;
        this.reverseMotion = 2;
        this.lastError = null;
        this.nextId = 1;
        this.listeners = new Set();
        this.app = app;
    }
    /* ---------------- subscription ---------------- */
    subscribe(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }
    emit() {
        for (const fn of [...this.listeners])
            fn();
    }
    /* ---------------- derived views ---------------- */
    parsedChords() {
        return this.timeline.filter((s) => s.chord).map((s) => s.chord);
    }
    chordViews() {
        return this.timeline.map((s) => (s.chord ? this.app.chordView(s.chord, s.bass) : null));
    }
    transitions() {
        const out = [];
        const slots = this.timeline.filter((s) => s.chord);
        for (let i = 0; i + 1 < slots.length; i++) {
            const a = slots[i], b = slots[i + 1];
            const report = this.app.transitionReport(a.chord, b.chord, {
                fromBass: a.bass,
                toBass: b.bass,
            });
            out.push({ index: i, report });
        }
        return out;
    }
    /** Chord view of the current keyboard/mouse selection. */
    selectionChordView() {
        const ch = this.selectionChord();
        if (!ch)
            return null;
        return this.app.chordView(ch, this.selection.bass ?? undefined);
    }
    selectionChord() {
        const { pcs, root } = this.selection;
        if (root === null || pcs.size < 2)
            return null;
        const others = normalizeSet([...pcs]).filter((p) => p !== mod12(root));
        if (!others.length)
            return null;
        const tokens = others.map((p) => pcToDegreeToken(mod12(p - root)));
        try {
            return makeChord(mod12(root), tokens);
        }
        catch {
            return null;
        }
    }
    scaleViewOf(inst) {
        return this.app.scaleView(inst);
    }
    /* ---------------- actions ---------------- */
    setMode(m) {
        this.mode = m;
        this.emit();
    }
    setReverseMotion(semi) {
        this.reverseMotion = mod12(semi);
        this.emit();
    }
    setActiveScale(inst) {
        this.activeScale = inst;
        this.emit();
    }
    /* timeline editing */
    addSlot(symbol = "") {
        this.timeline.push({ id: this.nextId++, symbol });
        this.reparse();
    }
    removeSlot(id) {
        this.timeline = this.timeline.filter((s) => s.id !== id);
        this.beats = this.beats.slice(0, this.timeline.length);
        this.reparse();
    }
    setSymbol(id, text) {
        const slot = this.timeline.find((s) => s.id === id);
        if (!slot)
            return;
        slot.symbol = text;
        this.reparse();
    }
    setBeats(index, beats) {
        while (this.beats.length <= index)
            this.beats.push(4);
        this.beats[index] = Math.max(1, Math.min(8, beats));
        this.emit();
    }
    reparse() {
        for (const slot of this.timeline) {
            slot.error = undefined;
            slot.chord = undefined;
            slot.bass = undefined;
            if (!slot.symbol.trim())
                continue;
            const r = this.app.parse(slot.symbol);
            if (r.ok && r.chord) {
                slot.chord = r.chord;
                slot.bass = r.bass;
            }
            else {
                slot.error = r.errors.join("; ") || "unrecognized";
            }
        }
        this.emit();
    }
    loadProgression(text) {
        const parts = text.includes(",")
            ? text.split(",")
            : text.includes("|")
                ? text.split("|")
                : text.split(/\s+(?=[A-Ga-g][#b]?)/);
        this.timeline = [];
        this.beats = [];
        for (const p of parts) {
            if (!p.trim())
                continue;
            this.addSlot(p.trim());
            this.beats.push(4);
        }
        this.emit();
    }
    /* selection / build-chord panel */
    togglePc(pc) {
        const p = mod12(pc);
        const { pcs, root } = this.selection;
        if (pcs.has(p)) {
            pcs.delete(p);
            if (root === p)
                this.selection.root = pcs.size ? [...pcs][0] : null;
            if (this.selection.bass === p)
                this.selection.bass = null;
        }
        else {
            pcs.add(p);
            if (root === null)
                this.selection.root = p; // first note clicked becomes root
        }
        this.emit();
    }
    setRoot(pc) {
        const p = mod12(pc);
        if (!this.selection.pcs.has(p))
            this.selection.pcs.add(p);
        this.selection.root = p;
        this.emit();
    }
    toggleBass(pc) {
        const p = mod12(pc);
        this.selection.bass = this.selection.bass === p ? null : p;
        this.emit();
    }
    clearSelection() {
        this.selection = emptySelection();
        this.emit();
    }
    /** Push the built chord onto the end of the timeline. */
    commitSelectionToTimeline() {
        const ch = this.selectionChord();
        if (!ch) {
            this.lastError = "Select at least two notes with a root to build a chord.";
            this.emit();
            return false;
        }
        const ctx = this.app.nameContext(normalizeSet([...this.selection.pcs, ch.root]));
        const exprs = this.app.expressions(ch, ctx);
        const sym = exprs[0]?.text ?? "?";
        this.addSlot(sym);
        this.lastError = null;
        this.emit();
        return true;
    }
    /** Build a chord from stacked scale degrees and load it into the selection. */
    buildFromScaleDegrees(degreeIndices) {
        if (!this.activeScale)
            return;
        const view = this.app.scaleView(this.activeScale);
        try {
            const ch = this.app.chordFromScaleDegrees(view, degreeIndices, 0);
            const pcs = [ch.root, ...ch.intervals.map((i) => mod12(ch.root + i.semitones))];
            this.selection = { pcs: new Set(pcs.map(mod12)), root: mod12(ch.root), bass: null };
            this.lastError = null;
        }
        catch (e) {
            this.lastError = e instanceof Error ? e.message : String(e);
        }
        this.emit();
    }
    setError(msg) {
        this.lastError = msg;
        this.emit();
    }
}
/* ------------------------------------------------------------------ */
/* helpers shared with panels                                          */
/* ------------------------------------------------------------------ */
/** Best-effort degree token for an interval above a root (for makeChord). */
export function pcToDegreeToken(semitonesAboveRoot) {
    const s = mod12(semitonesAboveRoot);
    const table = {
        0: "1", 1: "b9", 2: "9", 3: "b3", 4: "3", 5: "4", 6: "b5",
        7: "5", 8: "#5", 9: "6", 10: "b7", 11: "7",
    };
    return table[s] ?? `b${Math.round((s / 12) * 7) + 1}`;
}
export function scaleKey(inst) {
    return `${inst.def.id}@${inst.root}`;
}
//# sourceMappingURL=state.js.map