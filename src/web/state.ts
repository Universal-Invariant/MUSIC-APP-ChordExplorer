/**
 * Web state store: framework-free observable app state.
 * Panels subscribe to slices and re-render on change; they never mutate
 * state directly — everything flows through the action methods below.
 */
import { mod12, normalizeSet, PitchClass } from "../core/pitch.js";
import { Chord, makeChord } from "../theory/chord.js";
import { ScaleInstance } from "../theory/scale.js";
import { HarmonicApp, ChordView, ScaleView, TransitionReport } from "../analysis/api.js";

export interface TimelineSlot {
  id: number;
  symbol: string;
  chord?: Chord;
  bass?: PitchClass;
  error?: string;
}

export interface TransitionView {
  index: number;
  report: TransitionReport;
  /** scale instance picked by the user for this transition (optional) */
  chosenScaleKey?: string;
}

export interface SelectionState {
  pcs: Set<PitchClass>;
  root: PitchClass | null;
  bass: PitchClass | null;
}

export type Mode = "interpolate" | "reverse" | "explore";

const emptySelection = (): SelectionState => ({ pcs: new Set(), root: null, bass: null });

export class Store {
  readonly app: HarmonicApp;

  mode: Mode = "interpolate";
  timeline: TimelineSlot[] = [];
  beats: number[] = [];
  selection: SelectionState = emptySelection();
  activeScale: ScaleInstance | null = null;
  reverseMotion = 2;
  lastError: string | null = null;

  private nextId = 1;
  private listeners = new Set<() => void>();

  constructor(app: HarmonicApp) {
    this.app = app;
  }

  /* ---------------- subscription ---------------- */

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of [...this.listeners]) fn();
  }

  /* ---------------- derived views ---------------- */

  parsedChords(): Chord[] {
    return this.timeline.filter((s) => s.chord).map((s) => s.chord!);
  }

  chordViews(): (ChordView | null)[] {
    return this.timeline.map((s) => (s.chord ? this.app.chordView(s.chord, s.bass) : null));
  }

  transitions(): TransitionView[] {
    const out: TransitionView[] = [];
    const slots = this.timeline.filter((s) => s.chord);
    for (let i = 0; i + 1 < slots.length; i++) {
      const a = slots[i], b = slots[i + 1];
      const report = this.app.transitionReport(a.chord!, b.chord!, {
        fromBass: a.bass,
        toBass: b.bass,
      });
      out.push({ index: i, report });
    }
    return out;
  }

  /** Chord view of the current keyboard/mouse selection. */
  selectionChordView(): ChordView | null {
    const ch = this.selectionChord();
    if (!ch) return null;
    return this.app.chordView(ch, this.selection.bass ?? undefined);
  }

  selectionChord(): Chord | null {
    const { pcs, root } = this.selection;
    if (root === null || pcs.size < 2) return null;
    const others = normalizeSet([...pcs]).filter((p) => p !== mod12(root));
    if (!others.length) return null;
    const tokens = others.map((p) => pcToDegreeToken(mod12(p - root)));
    try {
      return makeChord(mod12(root), tokens);
    } catch {
      return null;
    }
  }

  scaleViewOf(inst: ScaleInstance): ScaleView {
    return this.app.scaleView(inst);
  }

  /* ---------------- actions ---------------- */

  setMode(m: Mode): void {
    this.mode = m;
    this.emit();
  }

  setReverseMotion(semi: number): void {
    this.reverseMotion = mod12(semi);
    this.emit();
  }

  setActiveScale(inst: ScaleInstance | null): void {
    this.activeScale = inst;
    this.emit();
  }

  /* timeline editing */

  addSlot(symbol = ""): void {
    this.timeline.push({ id: this.nextId++, symbol });
    this.reparse();
  }

  removeSlot(id: number): void {
    this.timeline = this.timeline.filter((s) => s.id !== id);
    this.beats = this.beats.slice(0, this.timeline.length);
    this.reparse();
  }

  setSymbol(id: number, text: string): void {
    const slot = this.timeline.find((s) => s.id === id);
    if (!slot) return;
    slot.symbol = text;
    this.reparse();
  }

  setBeats(index: number, beats: number): void {
    while (this.beats.length <= index) this.beats.push(4);
    this.beats[index] = Math.max(1, Math.min(8, beats));
    this.emit();
  }

  private reparse(): void {
    for (const slot of this.timeline) {
      slot.error = undefined;
      slot.chord = undefined;
      slot.bass = undefined;
      if (!slot.symbol.trim()) continue;
      const r = this.app.parse(slot.symbol);
      if (r.ok && r.chord) {
        slot.chord = r.chord;
        slot.bass = r.bass;
      } else {
        slot.error = r.errors.join("; ") || "unrecognized";
      }
    }
    this.emit();
  }

  loadProgression(text: string): void {
    const parts = text.includes(",")
      ? text.split(",")
      : text.includes("|")
        ? text.split("|")
        : text.split(/\s+(?=[A-Ga-g][#b]?)/);
    this.timeline = [];
    this.beats = [];
    for (const p of parts) {
      if (!p.trim()) continue;
      this.addSlot(p.trim());
      this.beats.push(4);
    }
    this.emit();
  }

  /* selection / build-chord panel */

  togglePc(pc: PitchClass): void {
    const p = mod12(pc);
    const { pcs, root } = this.selection;
    if (pcs.has(p)) {
      pcs.delete(p);
      if (root === p) this.selection.root = pcs.size ? [...pcs][0] : null;
      if (this.selection.bass === p) this.selection.bass = null;
    } else {
      pcs.add(p);
      if (root === null) this.selection.root = p; // first note clicked becomes root
    }
    this.emit();
  }

  setRoot(pc: PitchClass): void {
    const p = mod12(pc);
    if (!this.selection.pcs.has(p)) this.selection.pcs.add(p);
    this.selection.root = p;
    this.emit();
  }

  toggleBass(pc: PitchClass): void {
    const p = mod12(pc);
    this.selection.bass = this.selection.bass === p ? null : p;
    this.emit();
  }

  clearSelection(): void {
    this.selection = emptySelection();
    this.emit();
  }

  /** Push the built chord onto the end of the timeline. */
  commitSelectionToTimeline(): boolean {
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
  buildFromScaleDegrees(degreeIndices: number[]): void {
    if (!this.activeScale) return;
    const view = this.app.scaleView(this.activeScale);
    try {
      const ch = this.app.chordFromScaleDegrees(view, degreeIndices, 0);
      const pcs = [ch.root, ...ch.intervals.map((i) => mod12(ch.root + i.semitones))];
      this.selection = { pcs: new Set(pcs.map(mod12)), root: mod12(ch.root), bass: null };
      this.lastError = null;
    } catch (e) {
      this.lastError = e instanceof Error ? e.message : String(e);
    }
    this.emit();
  }

  setError(msg: string | null): void {
    this.lastError = msg;
    this.emit();
  }
}

/* ------------------------------------------------------------------ */
/* helpers shared with panels                                          */
/* ------------------------------------------------------------------ */

/** Best-effort degree token for an interval above a root (for makeChord). */
export function pcToDegreeToken(semitonesAboveRoot: number): string {
  const s = mod12(semitonesAboveRoot);
  const table: Record<number, string> = {
    0: "1", 1: "b9", 2: "9", 3: "b3", 4: "3", 5: "4", 6: "b5",
    7: "5", 8: "#5", 9: "6", 10: "b7", 11: "7",
  };
  return table[s] ?? `b${Math.round((s / 12) * 7) + 1}`;
}

export function scaleKey(inst: ScaleInstance): string {
  return `${inst.def.id}@${inst.root}`;
}
