/**
 * Public API facade. The UI (or a Rust port, or tests) should only talk to
 * this module — internals stay free to move around.
 */
import { intervalBetween, mod12, normalizeSet, PitchClass, toBitmask } from "../core/pitch.js";
import { Chord, chordBitmask, chordPCs, FormulaEntry, allFormulas, formulaForChord, makeChord } from "../theory/chord.js";
import { findScale, SCALE_CATALOG } from "../catalog/scales.js";
import { ScaleInstance, scaleBitmask, scaleIntervals } from "../theory/scale.js";
import { parseChordSymbol, ParseResult } from "../theory/parser.js";
import { spellSet } from "../theory/speller.js";
import { accidentalText, Letter } from "../theory/spelling.js";
import { degreeLabel } from "../theory/intervals.js";
import { SymbolRenderer, RenderedChord, NoteNameCtx } from "../display/symbol.js";
import {
  analyzeProgression, findChordsForScale, findInterpolatingScales, findTwoScaleOptions,
  InterpolationResult, ProgressionAnalysis, ReverseMatch, ScalePoolOptions, TwoScaleOption,
} from "./engine.js";
import { lookupRelationship, relationships, ChordRelationship } from "../catalog/relationships.js";

export interface TransitionReport {
  fromSymbol: string;
  toSymbol: string;
  rootMotion: number;
  /** bass pitch class when the input was a slash chord (informational) */
  fromBass?: PitchClass;
  toBass?: PitchClass;
  singleScaleOptions: InterpolationResult[];
  twoScaleFallback: TwoScaleOption[];
  curatedMatches: ChordRelationship[];
}

/* ---- visualization DTOs consumed by the UI panels ---- */

export interface ChordToneView {
  pc: PitchClass;
  name: string;
  degree: string;
  semitones: number;
  generic?: number;
}

export interface ChordView {
  root: PitchClass;
  rootName: string;
  quality: string;
  formulaId?: string;
  tones: ChordToneView[];
  bass?: PitchClass;
  bassName?: string;
  bitmask: number;
  expressions: { strategy: string; text: string }[];
}

export interface ScaleDegreeView {
  degree: number;
  pc: PitchClass;
  offset: number;
  name: string;
  label: string;
}

export interface ScaleView {
  def: ScaleInstance["def"];
  root: PitchClass;
  rootName: string;
  degrees: ScaleDegreeView[];
  bitmask: number;
}

const LETTER_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** semitone offsets of scale-degree 1..7 on the natural (white-key) letters */
const NATURAL_SEMI = [0, 2, 4, 5, 7, 9, 11];

function scaleIntervalsOf(def: ScaleInstance["def"]): number[] {
  return scaleIntervals(def);
}

export class HarmonicApp {
  readonly renderer = new SymbolRenderer();
  private formulaEntries: FormulaEntry[];

  constructor() {
    this.formulaEntries = allFormulas();
  }

  /* ---------------- input ---------------- */

  parse(text: string): ParseResult {
    return parseChordSymbol(text, this.formulaEntries);
  }

  /** Parse a progression: comma- or bar-separated chords ("Am7, D7, Gmaj7"). */
  parseProgression(text: string): { chords: Chord[]; errors: string[] } {
    let parts: string[];
    if (text.includes(",")) parts = text.split(",");
    else if (/\|/.test(text)) parts = text.split("|");
    else parts = text.split(/\s+(?=[A-Ga-g][#b]?)/);
    const chords: Chord[] = [];
    const errors: string[] = [];
    for (const p of parts) {
      const r = this.parse(p);
      if (r.ok && r.chord) chords.push(r.chord);
      else errors.push(...r.errors.map((e) => `"${p.trim()}": ${e}`));
    }
    return { chords, errors };
  }

  /* ---------------- display ---------------- */

  /** Build a spelling context anchored on the given roots. */
  nameContext(anchorRoots: PitchClass[], preferFlats = false): NoteNameCtx {
    const pcs = anchorRoots.length ? anchorRoots : [0];
    const map = spellSet(pcs, { preferFlats });
    return { spellings: map };
  }

  expressions(ch: Chord, ctx?: NoteNameCtx): { strategy: string; text: string }[] {
    const rc: RenderedChord = {
      root: ch.root,
      degrees: ch.intervals.map((i) => ({ semitones: i.semitones, generic: i.generic })),
    };
    const names = normalizeSet([ch.root, ...ch.intervals.map((i) => mod12(ch.root + i.semitones))]);
    const defaultCtx = this.nameContext(names);
    return this.renderer.renderAll(rc, ctx ?? defaultCtx);
  }

  scaleNotes(inst: ScaleInstance, ctx?: NoteNameCtx): string[] {
    const pcs = inst.def.steps.map((_, i) => mod12(inst.root + inst.def.steps.slice(0, i).reduce((a, b) => a + b, 0)));
    const c = ctx ?? this.nameContext(pcs);
    return pcs.map((p) => {
      const s = c.spellings.get(p);
      return s ? `${s.letter}${s.accidental === 0 ? "" : s.accidental > 0 ? "#".repeat(s.accidental) : "b".repeat(-s.accidental)}` : "?";
    });
  }

  /* ---------------- visualization support (panels) ---------------- */

  /**
   * Everything a chord panel needs to render one chord: spelled note names in
   * ascending order from the root, degree labels, and slash-bass info.
   */
  chordView(ch: Chord, bass?: PitchClass): ChordView {
    const ctx = this.nameContext(normalizeSet([ch.root, ...ch.intervals.map((i) => mod12(ch.root + i.semitones)), ...(bass !== undefined ? [bass] : [])]));
    const tones = ch.intervals
      .map((i) => ({
        semitones: mod12(i.semitones),
        generic: i.generic,
        pc: mod12(ch.root + i.semitones),
        name: this.spelledName(ctx, mod12(ch.root + i.semitones)),
        degree: degreeLabel(mod12(i.semitones), i.generic),
      }))
      .sort((a, b) => a.semitones - b.semitones);
    const formula = formulaForChord(ch);
    const symbolTexts = this.expressions(ch, ctx).slice(0, 8);
    return {
      root: ch.root,
      rootName: this.spelledName(ctx, mod12(ch.root)),
      quality: ch.quality,
      formulaId: formula?.id,
      tones: [{ pc: mod12(ch.root), name: this.spelledName(ctx, mod12(ch.root)), degree: "1", semitones: 0 }, ...tones],
      bass,
      bassName: bass !== undefined ? this.spelledName(ctx, mod12(bass)) : undefined,
      bitmask: chordBitmask(ch) | (bass !== undefined ? (1 << mod12(bass)) : 0),
      expressions: symbolTexts,
    };
  }

  /** Everything a scale panel needs: ordered spelled degrees with labels. */
  scaleView(inst: ScaleInstance): ScaleView {
    const offs = scaleIntervalsOf(inst.def);
    const pcs = offs.map((o) => mod12(inst.root + o));
    const ctx = this.nameContext(pcs);
    const spelled = inst.def.degrees && inst.def.degrees.length === offs.length
      ? inst.def.degrees
      : null;
    const degrees = offs.map((o, i) => {
      const pc = mod12(inst.root + o);
      const sp = spelled?.[i] ?? ctx.spellings.get(pc);
      const acc = sp ? sp.accidental : 0;
      const natural = sp ? LETTER_PC[sp.letter] : pc;
      const alter = mod12(pc - natural); // 0 natural, 1 sharp, 11 flat-side
      return {
        degree: i + 1,
        pc,
        offset: o,
        name: sp ? sp.letter + accidentalText(acc) : "?",
        label: `${i + 1}${alter === 1 ? "#" : alter === 11 ? "b" : alter >= 2 && alter <= 5 ? "#".repeat(alter) : alter >= 7 ? "b".repeat(12 - alter) : ""}`,
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
  chordFromScaleDegrees(view: ScaleView, degreeIndices: number[], rootIndex = 0): Chord {
    const base = view.degrees[rootIndex];
    const tokens = degreeIndices
      .filter((d) => d !== (rootIndex + 1))
      .map((d) => {
        const deg = view.degrees.find((x) => x.degree === d);
        if (!deg) throw new Error(`degree ${d} not in scale`);
        const generic = ((d - (rootIndex + 1)) % view.degrees.length + view.degrees.length) % view.degrees.length + 1;
        const semi = mod12(deg.pc - base.pc);
        const naturalOffset = NATURAL_SEMI[Math.min(generic - 1, 6)] ?? 0;
        const alter = mod12(semi - naturalOffset + 6) - 6;
        const accTxt = alter > 0 ? "#".repeat(alter) : alter < 0 ? "b".repeat(-alter) : "";
        return `${accTxt}${generic > 7 ? generic : generic}`;
      });
    return makeChord(base.pc, tokens.length ? tokens : ["3", "5"], undefined);
  }

  private spelledName(ctx: NoteNameCtx, pc: PitchClass): string {
    const s = ctx.spellings.get(mod12(pc));
    return s ? s.letter + accidentalText(s.accidental) : "?";
  }

  /* ---------------- analysis ---------------- */

  interpolate(x: Chord, y: Chord, opts?: ScalePoolOptions): InterpolationResult[] {
    return findInterpolatingScales(x, y, opts);
  }

  twoScaleFallback(x: Chord, y: Chord, opts?: ScalePoolOptions): TwoScaleOption[] {
    return findTwoScaleOptions(x, y, opts);
  }

  reverse(scales: ScaleInstance[], rootMotion: number): ReverseMatch[] {
    return findChordsForScale(scales, rootMotion);
  }

  progression(chords: Chord[]): ProgressionAnalysis {
    return analyzeProgression(chords);
  }

  /**
   * Rich per-transition report including curated relationship matches.
   * The `bass` fields let slash-chord input (AmM7/F, Caug/B) participate in
   * set-wise matching without losing the bass tone.
   */
  transitionReport(from: Chord, to: Chord, opts?: ScalePoolOptions & {
    fromBass?: PitchClass; toBass?: PitchClass;
  }): TransitionReport {
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
  containsWithBass(inst: ScaleInstance, ch: Chord, bass?: PitchClass): boolean {
    const mask = scaleBitmask(inst);
    for (const p of chordPCs(ch)) if (!(mask & (1 << p))) return false;
    if (bass !== undefined && !(mask & (1 << mod12(bass)))) return false;
    return true;
  }

  /* ---------------- catalog access ---------------- */

  scales() { return [...SCALE_CATALOG.values()]; }
  findScale(idOrAbbr: string) { return findScale(idOrAbbr); }
  relationshipTable(): ChordRelationship[] { return relationships(); }
}

export type { Chord, InterpolationResult, ReverseMatch, TwoScaleOption, ChordRelationship };
