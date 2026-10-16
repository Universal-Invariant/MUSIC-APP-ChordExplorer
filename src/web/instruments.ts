/**
 * Pluggable instrument visualizers.
 *
 * A Visualizer knows how to draw a pitch-class highlight map for one family
 * of instruments and how to translate a click back into a pitch class.
 * Register new instruments (banjo, sax, ...) by pushing an entry onto
 * `INSTRUMENTS` — panels never hard-code keyboards or fretboards; they ask
 * the registry for the active visualizer. Only two renderer kinds are needed
 * today: piano-style keybeds and stringed instruments (any tuning).
 */
import { mod12, PitchClass } from "../core/pitch.js";
import { el, on } from "./dom.js";
import { keyboardStrip, fretGrid, Highlight } from "./panels/visual.js";

export interface VisualizerOpts {
  highlights: Highlight[];
  names?: Map<PitchClass, string>;
  onClickPc?: (pc: PitchClass, ev: MouseEvent) => void;
}

export interface Visualizer {
  render(opts: VisualizerOpts): HTMLElement;
}

/* ------------------------------------------------------------------ */
/* piano                                                               */
/* ------------------------------------------------------------------ */

const pianoVisualizer: Visualizer = {
  render(o) {
    return keyboardStrip(o.highlights, { names: o.names, onClickPc: o.onClickPc });
  },
};

/* ------------------------------------------------------------------ */
/* stringed instruments: one shared fret-grid renderer + tunings       */
/* ------------------------------------------------------------------ */

interface StringSpec {
  /** open-string pitch classes, ordered high pitch -> low pitch */
  tuning: PitchClass[];
  name: string;
  label: string;
  frets: number;
  /** open strings playable below the nut (e.g. violin E-A-D-G includes all) */
  restring?: boolean;
}

function stringVisualizer(spec: StringSpec): Visualizer {
  return {
    render(o) {
      return fretGrid(spec.tuning, spec.frets, o.highlights, { names: o.names, onClickPc: o.onClickPc });
    },
  };
}

// Tunings listed high->low so the top row is the thinnest/highest string.
const GUITAR: PitchClass[] = [4, 11, 7, 2, 9, 4];            // e A D G B e
const MANDOLIN: PitchClass[] = [4, 4, 11, 11, 7, 7, 2, 2];   // e e A A d d g g (courses)
const VIOLIN: PitchClass[] = [4, 11, 7, 2];                  // E A D G
const CELLO: PitchClass[] = [4, 11, 7, 2];                   // A D G C -> pcs
const BASS: PitchClass[] = [7, 2, 9, 4];                     // G D A E

// cello/violin share pcs but differ in display range; keep separate entries.
export const INSTRUMENTS: { id: string; name: string; visualizer: Visualizer }[] = [
  { id: "piano", name: "Piano", visualizer: pianoVisualizer },
  { id: "guitar", name: "Guitar (standard)", visualizer: stringVisualizer({ tuning: GUITAR, name: "Guitar", label: "EADGBe", frets: 15 }) },
  { id: "mandolin", name: "Mandolin", visualizer: stringVisualizer({ tuning: MANDOLIN, name: "Mandolin", label: "EADG courses", frets: 15 }) },
  { id: "violin", name: "Violin", visualizer: stringVisualizer({ tuning: VIOLIN, name: "Violin", label: "GDAE", frets: 16 }) },
  { id: "cello", name: "Cello", visualizer: stringVisualizer({ tuning: CELLO, name: "Cello", label: "CGDA", frets: 8 }) },
  { id: "bass", name: "Bass guitar", visualizer: stringVisualizer({ tuning: BASS, name: "Bass", label: "EADG", frets: 12 }) },
];

export function getVisualizer(id: string): Visualizer {
  return INSTRUMENTS.find((i) => i.id === id)?.visualizer ?? INSTRUMENTS[0].visualizer;
}

/** Instrument selector bound to a getter/setter pair. */
export function instrumentPicker(currentId: string, onChange: (id: string) => void): HTMLElement {
  const box = el("div", { class: "inst-picker" });
  box.appendChild(el("label", { class: "muted small" }, "Visualizer "));
  const sel = el("select", { class: "input" }) as HTMLSelectElement;
  for (const inst of INSTRUMENTS) {
    const o = el("option", { value: inst.id }, inst.name) as HTMLOptionElement;
    if (inst.id === currentId) o.selected = true;
    sel.appendChild(o);
  }
  on(sel, "change", () => onChange(sel.value));
  box.appendChild(sel);
  return box;
}

/** Helper used by chord voicing: nearest ascending notes above a floor pc. */
export function voiceChord(pcs: PitchClass[], floor: PitchClass = 0): PitchClass[] {
  const sorted = [...new Set(pcs.map(mod12))].sort((a, b) => a - b);
  if (!sorted.length) return [];
  const out: PitchClass[] = [];
  let last = -1;
  for (const p of sorted) {
    const voiced = p <= last ? p + 12 : p;
    out.push(voiced);
    last = voiced;
  }
  // shift so the lowest tone sits at/above the requested floor octave
  const base = out[0];
  const shift = Math.floor((mod12(floor - base) + 12) / 12);
  return out.map((p) => p + shift * 12);
}
