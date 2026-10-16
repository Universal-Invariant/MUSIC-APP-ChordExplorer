/**
 * Spelling engine: choose note names for a pitch-class set so that symbols
 * read correctly in context. Strategy: anchor on the chord root (or scale
 * tonic), then walk letter space minimizing accidental distance per semitone
 * step, with flat-preference bias for flat-leaning collections.
 */
import { intervalBetween, mod12, PitchClass } from "../core/pitch.js";
import { LETTERS, Letter, Spelling, spellingPC } from "./spelling.js";

const LETTER_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const FLAT_PREFER = new Set<PitchClass>([3, 8, 10]); // Eb, Ab, Bb read better flat

export interface SpellOptions {
  /** force these spellings first (e.g. the chord root) */
  anchors?: Map<PitchClass, Spelling>;
  /** global preference when ambiguous */
  preferFlats?: boolean;
  /**
   * Anchor pc whose letter defines the reference point for generic-distance
   * scoring. Degrees are then spelled by letter distance from this anchor:
   * semitone 1 above an F-root becomes Gb (a second), never Abb (a doubly-
   * diminished unison). Defaults to the lowest-numbered anchor.
   */
  anchorRoot?: PitchClass;
}

/** Natural letter whose base pc equals `pc`, or null. */
function naturalLetter(pc: PitchClass): Letter | null {
  for (const l of LETTERS) if (LETTER_PC[l] === pc) return l;
  return null;
}

/** The pc->letter mapping implied by an exact degree spec (semitones, generic). */
function degreeSpellMap(rootPc: PitchClass, rootSpelling: Spelling, degrees: { semitones: number; generic: number }[]): Map<PitchClass, Spelling> {
  const out = new Map<PitchClass, Spelling>();
  out.set(mod12(rootPc), rootSpelling);
  for (const d of degrees) {
    const pc = mod12(rootPc + d.semitones);
    const target = LETTERS[(LETTERS.indexOf(rootSpelling.letter) + d.generic) % 7];
    const acc = intervalBetween(LETTER_PC[target], pc); // 0..11
    const simple = acc <= 6 ? acc : acc - 12;
    out.set(pc, { letter: target, accidental: simple });
  }
  return out;
}

/**
 * Spell a collection of pitch classes. Returns pc -> Spelling.
 * When `anchorRoot` + exact `degrees` are supplied the spelling is derived
 * deterministically from interval theory (one letter per degree, correct
 * accidentals). Otherwise a heuristic walk assigns nearest-letter spellings.
 */
export function spellSet(pcs: PitchClass[], opts: SpellOptions & {
  degrees?: { semitones: number; generic: number }[];
} = {}): Map<PitchClass, Spelling> {
  const ordered = [...new Set(pcs.map(mod12))];

  // Exact path: derive every spelling from the root + degree specs.
  if (opts.anchorRoot !== undefined && opts.degrees && opts.degrees.length > 0) {
    const rootSp = opts.anchors?.get(mod12(opts.anchorRoot)) ?? { letter: "C" as Letter, accidental: 0 };
    const map = degreeSpellMap(opts.anchorRoot, rootSp, opts.degrees);
    const result = new Map<PitchClass, Spelling>();
    for (const pc of ordered) {
      const s = map.get(pc);
      if (s) { result.set(pc, s); continue; }
      // tone present in the set but absent from the specs (e.g. slash bass):
      // nearest natural letter, then fall back to the heuristic below.
      const nl = naturalLetter(pc);
      if (nl) { result.set(pc, { letter: nl, accidental: 0 }); continue; }
      result.set(pc, heuristicSpell(pc, new Set([...result.values()].map((v) => v.letter)), opts));
    }
    return result;
  }

  const result = new Map<PitchClass, Spelling>();
  const used = new Set<Letter>();

  // apply anchors
  if (opts.anchors) {
    for (const [pc, sp] of opts.anchors) {
      if (ordered.includes(pc)) { result.set(pc, sp); used.add(sp.letter); }
    }
  }

  for (const pc of ordered) {
    if (result.has(pc)) continue;
    result.set(pc, heuristicSpell(pc, used, opts));
    used.add(result.get(pc)!.letter);
  }
  return result;
}

/** Heuristic single-pc spelling with duplicate-letter and flat-bias scoring. */
function heuristicSpell(pc: PitchClass, used: Set<Letter>, opts: SpellOptions): Spelling {
  let best: Spelling | null = null;
  let bestScore = Infinity;
  const flatsFirst = opts.preferFlats ?? false;
  for (const letter of LETTERS) {
    let acc = mod12(pc - LETTER_PC[letter] + 6) - 6; // -6..5 -> use nearest
    if (acc > 6) acc -= 12; else if (acc < -6) acc += 12;
    if (Math.abs(acc) > 2) continue;
    let score = Math.abs(acc) * 2;
    if (used.has(letter)) score += 3;                       // avoid double letters
    const prefersFlat = flatsFirst || FLAT_PREFER.has(pc);
    if (prefersFlat && acc > 0) score += 1.5;               // nudge toward flats
    if (!prefersFlat && acc < 0 && pc !== 1 && pc !== 6) score += 0.5;
    if (score < bestScore) { bestScore = score; best = { letter, accidental: acc }; }
  }
  return best ?? nearestNatural(pc);
}

function nearestNatural(pc: PitchClass): Spelling {
  const naturals: [Letter, number][] = [["C", 0], ["D", 2], ["E", 4], ["F", 5], ["G", 7], ["A", 9], ["B", 11]];
  let best: Spelling = { letter: "C", accidental: 0 };
  let bd = 99;
  for (const [l, b] of naturals) {
    const d = Math.min(mod12(b - pc), mod12(pc - b));
    if (d < bd) { bd = d; best = { letter: l, accidental: mod12(pc - b + 6) - 6 }; }
  }
  return best;
}

/** Verify spelling consistency: returns pitch classes whose spelling matches. */
export function verifySpellings(map: Map<PitchClass, Spelling>): boolean {
  for (const [pc, sp] of map) if (spellingPC(sp) !== mod12(pc)) return false;
  return true;
}
