/**
 * Note spelling: letter + accidental. Kept separate from pitch-class math so
 * display layers can be swapped without touching theory.
 */
import { mod12, PitchClass } from "../core/pitch.js";

export type Letter = "C" | "D" | "E" | "F" | "G" | "A" | "B";

/** A spelled note: letter with an arbitrary (normalized) accidental offset. */
export interface Spelling {
  letter: Letter;
  /** semitone alteration: -2 bb, -1 b, 0 natural, +1 #, +2 x */
  accidental: number;
}

const LETTER_BASE: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const LETTERS: Letter[] = ["C", "D", "E", "F", "G", "A", "B"];

export function spellingPC(n: Spelling): PitchClass {
  return mod12(LETTER_BASE[n.letter] + n.accidental);
}

export function makeSpelling(letter: Letter, accidental = 0): Spelling {
  return { letter, accidental };
}

/** Pretty-print an accidental count. */
export function accidentalText(acc: number): string {
  switch (acc) {
    case 0: return "";
    case 1: return "#";
    case -1: return "b";
    case 2: return "x";
    case -2: return "bb";
    default: {
      const a = Math.abs(acc);
      return (acc > 0 ? "#" : "b") + (a > 2 ? String(a) : "");
    }
  }
}

export function formatSpelling(n: Spelling): string {
  return n.letter + accidentalText(n.accidental);
}

/** Parse things like "C", "F#", "Bb", "Ebx". Returns null on failure. */
export function parseSpelling(text: string): Spelling | null {
  const m = /^([A-Ga-g])\s*([#b♯♭x\u2103!]*|bb)$/.exec(text.trim());
  if (!m) return null;
  const letter = m[1].toUpperCase() as Letter;
  let acc = 0;
  const rest = m[2];
  for (let i = 0; i < rest.length; i++) {
    const c = rest[i];
    if (c === "#" || c === "\u266F" || c === "!") acc += 1;
    else if (c === "b" || c === "\u266D") acc -= 1;
    else if (c === "x" || c === "\u2103") acc += 2;
    else return null;
  }
  return { letter, accidental: acc };
}

/** All plausible spellings of a pitch class (letters whose base is within ±2). */
export function spellingsOf(pc: PitchClass): Spelling[] {
  const out: Spelling[] = [];
  for (const letter of LETTERS) {
    const d = mod12(pc - LETTER_BASE[letter]); // 0..11
    const acc = d <= 6 ? d : d - 12;          // prefer nearest (-2..+2 range clipped)
    if (Math.abs(acc) <= 2) out.push({ letter, accidental: acc });
  }
  return out.sort((a, b) => Math.abs(a.accidental) - Math.abs(b.accidental));
}

export function bestSpelling(pc: PitchClass): Spelling {
  return spellingsOf(pc)[0];
}
