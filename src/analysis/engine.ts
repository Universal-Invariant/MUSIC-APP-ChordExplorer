/**
 * Analysis engine.
 *
 *  - findInterpolatingScales(X, Y): every catalogued scale (all roots, all
 *    modes) that contains both chords, ranked so the most natural options come
 *    first; plus two-scale fallbacks when no single scale fits.
 *  - findChordsForScale(scales, rootMotion): reverse lookup — enumerate chord
 *    pairs whose roots move by `rootMotion` and which both fit the given
 *    scale(s).
 *  - analyzeProgression: timeline of transitions.
 */
import { intervalBetween, mod12, normalizeSet, PC_NAMES_SHARP, toBitmask } from "../core/pitch.js";
import { Chord, chordPCs, formulaForChord, makeChord } from "../theory/chord.js";
import { containsChord, overlapCount, ScaleDef, ScaleInstance, scalePCs } from "../theory/scale.js";
import { SCALE_CATALOG } from "../catalog/scales.js";
import { catalogChordFormulas, ChordCatalogOptions } from "../catalog/chords.js";
import { lookupRelationship, ChordRelationship } from "../catalog/relationships.js";

/* ------------------------------------------------------------------ */
/* scale pool                                                          */
/* ------------------------------------------------------------------ */

export interface ScalePoolOptions {
  /** restrict to these scale ids (default: whole catalog) */
  includeIds?: string[];
  excludeIds?: string[];
}

export function scaleDefs(opts: ScalePoolOptions = {}): ScaleDef[] {
  let defs = [...SCALE_CATALOG.values()];
  if (opts.includeIds) defs = defs.filter((d) => opts.includeIds!.includes(d.id));
  if (opts.excludeIds) defs = defs.filter((d) => !opts.excludeIds!.includes(d.id));
  return defs;
}

/* ------------------------------------------------------------------ */
/* ranking                                                             */
/* ------------------------------------------------------------------ */

export type Naturalness = "strong" | "good" | "partial";

export interface FitDetail {
  /** scale degree (1-based) each chord is built on, when its root is in scale */
  fromDegree: number | null;
  toDegree: number | null;
  /** how many chord tones land on a strong beat position (root/3rd/5th/7th stack) */
  fromTernaryHits: number;
  toTernaryHits: number;
}

export interface InterpolationResult {
  scale: ScaleInstance;
  /** semitones from result scale root to each chord root */
  fromOffset: number;
  toOffset: number;
  coversBoth: boolean;
  coverageFrom: number; // 0..1 fraction of X's tones inside the scale
  coverageTo: number;
  naturalness: Naturalness;
  score: number;
  detail: FitDetail;
}

function ternaryHits(inst: ScaleInstance, ch: Chord): number {
  // count chord tones sitting on odd degrees (3rds/5ths/7ths) of the scale
  const pcs = scalePCs(inst);
  let hits = 0;
  for (const p of chordPCs(ch)) {
    const idx = pcs.indexOf(mod12(p));
    if (idx >= 0 && idx % 2 === 0) hits++; // even index = stacked-third position
  }
  return hits;
}

export function rankKey(r: InterpolationResult): number {
  return r.score;
}

/**
 * All scales containing both chords (single-scale interpolation), then
 * partial-cover scales as fallback, ranked naturally-first.
 */
export function findInterpolatingScales(
  x: Chord,
  y: Chord,
  opts: ScalePoolOptions = {},
): InterpolationResult[] {
  const results: InterpolationResult[] = [];
  const xPcs = chordPCs(x);
  const yPcs = chordPCs(y);

  for (const def of scaleDefs(opts)) {
    const size = def.steps.length;
    for (let root = 0; root < 12; root++) {
      // symmetric scales have fewer distinct transpositions — skip duplicates
      if (root > 0 && isSymmetric(def) && root % symmetryPeriod(def) !== 0) continue;
      const inst: ScaleInstance = { def, root };
      const coversX = containsChord(inst, xPcs);
      const coversY = containsChord(inst, yPcs);
      const covFrom = overlapCount(inst, xPcs) / xPcs.length;
      const covTo = overlapCount(inst, yPcs) / yPcs.length;
      if (!coversX && !coversY && covFrom < 0.5 && covTo < 0.5) continue;

      const fromOffset = intervalBetween(root, x.root);
      const toOffset = intervalBetween(root, y.root);
      const pcsOrdered = scalePCs(inst);
      const detail: FitDetail = {
        fromDegree: pcsOrdered.includes(mod12(x.root)) ? pcsOrdered.indexOf(mod12(x.root)) + 1 : null,
        toDegree: pcsOrdered.includes(mod12(y.root)) ? pcsOrdered.indexOf(mod12(y.root)) + 1 : null,
        fromTernaryHits: ternaryHits(inst, x),
        toTernaryHits: ternaryHits(inst, y),
      };

      let naturalness: Naturalness;
      let score: number;
      if (coversX && coversY) {
        naturalness = "strong";
        score = 1000
          + 100 * size                       // prefer tight parent sets
          + 10 * (detail.fromTernaryHits + detail.toTernaryHits)
          + ((detail.fromDegree ?? 0) > 0 && (detail.toDegree ?? 0) > 0 ? 20 : 0);
        // Curated-table boost: if a curated row names this exact mode (by
        // abbreviation) for these chord formulas + root motion, rank it first.
        const fx = formulaForChord(x)?.id;
        const fy = formulaForChord(y)?.id;
        if (fx && fy) {
          const motion = intervalBetween(x.root, y.root);
          const curated = lookupRelationship(fx, fy, motion);
          if (curated.some((c) => c.fromModeAbbr === inst.def.abbr || c.toModeAbbr === inst.def.abbr)) {
            score += 500;
          }
        }
      } else if (coversX || coversY) {
        naturalness = "good";
        const other = coversX ? covTo : covFrom;
        score = 400 + Math.round(300 * other) + 5 * (detail.fromTernaryHits + detail.toTernaryHits);
      } else {
        naturalness = "partial";
        score = 100 + Math.round(100 * (covFrom + covTo));
      }
      results.push({
        scale: inst, fromOffset, toOffset,
        coversBoth: coversX && coversY,
        coverageFrom: covFrom, coverageTo: covTo,
        naturalness, score, detail,
      });
    }
  }
  return results.sort((a, b) => b.score - a.score || a.scale.def.id.localeCompare(b.scale.def.id));
}

function isSymmetric(def: ScaleDef): boolean {
  const steps = def.steps;
  const n = steps.length;
  for (let period = 1; period < n; period++) {
    if (n % period !== 0) continue;
    let ok = true;
    for (let i = 0; i < n; i++) if (steps[i] !== steps[i % period]) { ok = false; break; }
    if (ok) return true;
  }
  return false;
}

function symmetryPeriod(def: ScaleDef): number {
  const steps = def.steps;
  const n = steps.length;
  for (let period = 1; period < n; period++) {
    if (n % period !== 0) continue;
    let ok = true;
    for (let i = 0; i < n; i++) if (steps[i] !== steps[i % period]) { ok = false; break; }
    if (ok) return period;
  }
  return n;
}

/* ------------------------------------------------------------------ */
/* two-scale fallback                                                  */
/* ------------------------------------------------------------------ */

export interface TwoScaleOption {
  first: ScaleInstance;   // covers X
  second: ScaleInstance;  // covers Y
  sharedTones: number;    // intersection size between the two scales
  note: string;
}

/** When no single scale covers both, list natural scale pairs. */
export function findTwoScaleOptions(x: Chord, y: Chord, opts: ScalePoolOptions = {}, limit = 12): TwoScaleOption[] {
  const coveringX = findInterpolatingScales(x, x, opts).filter((r) => r.coverageFrom === 1).map((r) => r.scale);
  const coveringY = findInterpolatingScales(y, y, opts).filter((r) => r.coverageTo === 1 || r.coverageFrom === 1).map((r) => r.scale);
  const out: TwoScaleOption[] = [];
  for (const a of coveringX) {
    for (const b of coveringY) {
      const setA = new Set(scalePCs(a));
      const shared = scalePCs(b).filter((p) => setA.has(p)).length;
      out.push({
        first: a, second: b, sharedTones: shared,
        note: shared >= 5 ? "pivot-heavy pair" : shared >= 3 ? "moderate common ground" : "contrast pair",
      });
    }
  }
  return out.sort((p, q) => q.sharedTones - p.sharedTones).slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* reverse lookup: scale(s) + root motion -> chords                    */
/* ------------------------------------------------------------------ */

export interface ChordCandidate {
  chord: Chord;
  /** display symbol (root name + formula alias), always defined */
  label: string;
  /** spelled degrees relative to scale root, 1-based */
  degree: number;
  /** diatonic-ish label like "maj7 on degree 5" */
  description: string;
}

export interface ReverseMatch {
  from: ChordCandidate;
  to: ChordCandidate;
  rootMotion: number;
  scale: ScaleInstance;
}

/** Default sharp-side display name for a pitch class (context-free fallback). */
export function pcToNoteName(pc: number): string {
  return PC_NAMES_SHARP[mod12(pc)];
}

function candidateChordsOn(inst: ScaleInstance, chordOpts: ChordCatalogOptions): ChordCandidate[] {
  const pcs = scalePCs(inst);
  const mask = toBitmask(pcs);
  const out: ChordCandidate[] = [];
  const formulas = catalogChordFormulas(chordOpts);
  for (let deg = 0; deg < pcs.length; deg++) {
    const root = pcs[deg];
    for (const f of formulas) {
      const offs = f.intervals.map((i) => mod12(i.semitones));
      if (offs.some((o) => o === 0)) continue;
      const members = [0, ...offs].map((o) => mod12(root + o));
      if (members.every((m) => mask & (1 << m))) {
        out.push({
          chord: makeChord(root, f.degrees, `${f.id}`),
          label: `${pcToNoteName(root)}${f.aliases[0] ?? f.id}`,
          degree: deg + 1,
          description: `${f.id} on degree ${deg + 1}`,
        });
      }
    }
  }
  return out;
}

/**
 * Given one or two scales and an ascending root motion, enumerate chord pairs
 * (from, to) such that both chords fit the scale(s). With two scales, X must
 * fit the first and Y the second (mirroring the interpolation use-case).
 */
export function findChordsForScale(
  scales: ScaleInstance[],
  rootMotion: number,
  chordOpts: ChordCatalogOptions = {},
): ReverseMatch[] {
  const motion = mod12(rootMotion);
  const matches: ReverseMatch[] = [];
  if (scales.length === 1) {
    const cands = candidateChordsOn(scales[0], chordOpts);
    for (const a of cands) {
      for (const b of cands) {
        if (intervalBetween(a.chord.root, b.chord.root) === motion && a.degree !== b.degree) {
          matches.push({ from: a, to: b, rootMotion: motion, scale: scales[0] });
        }
      }
    }
  } else {
    const [s1, s2] = scales;
    const c1 = candidateChordsOn(s1, chordOpts);
    const c2 = candidateChordsOn(s2, chordOpts);
    for (const a of c1) {
      for (const b of c2) {
        if (intervalBetween(a.chord.root, b.chord.root) === motion) {
          matches.push({ from: a, to: b, rootMotion: motion, scale: s1 });
        }
      }
    }
  }
  return matches;
}

/* ------------------------------------------------------------------ */
/* progression timeline                                                */
/* ------------------------------------------------------------------ */

export interface TransitionAnalysis {
  index: number;                 // transition between chord[index] and [index+1]
  from: Chord;
  to: Chord;
  rootMotion: number;            // ascending semitones
  singleScaleOptions: InterpolationResult[];
  twoScaleFallback: TwoScaleOption[];
  /** curated relationship rows matching this exact (formula, formula, motion) */
  curatedMatches: ChordRelationship[];
}

export interface ProgressionAnalysis {
  chords: Chord[];
  transitions: TransitionAnalysis[];
}

export function analyzeProgression(chords: Chord[], opts: ScalePoolOptions = {}): ProgressionAnalysis {
  const transitions: TransitionAnalysis[] = [];
  for (let i = 0; i + 1 < chords.length; i++) {
    const from = chords[i];
    const to = chords[i + 1];
    const singles = findInterpolatingScales(from, to, opts);
    const needsFallback = !singles.some((s) => s.coversBoth);
    const motion = intervalBetween(from.root, to.root);
    const ff = formulaForChord(from)?.id;
    const ft = formulaForChord(to)?.id;
    transitions.push({
      index: i,
      from, to,
      rootMotion: motion,
      singleScaleOptions: singles.filter((s) => s.naturalness !== "partial").slice(0, 40),
      twoScaleFallback: needsFallback ? findTwoScaleOptions(from, to, opts) : [],
      curatedMatches: ff && ft ? lookupRelationship(ff, ft, motion) : [],
    });
  }
  return { chords, transitions };
}

/** Formula id of a chord candidate (for relationship-catalog cross-checks). */
export function candidateFormulaId(c: ChordCandidate): string | undefined {
  return formulaForChord(c.chord)?.id;
}

