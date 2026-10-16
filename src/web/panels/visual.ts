/**
 * Shared visual renderers for pitch content: a piano-keyboard strip and a
 * fretboard-style dot grid. Both are pure functions of (pitch-class set,
 * highlight sets) so any panel can drop them in — plug-and-play display.
 */
import { mod12, PitchClass } from "../../core/pitch.js";
import { PC_NAMES_SHARP } from "../../core/pitch.js";
import { el, on } from "../dom.js";

export interface Highlight {
  pcs: Set<PitchClass>;
  /** css class suffix, e.g. "root", "tone", "bass", "scale" */
  kind: string;
}

const WHITE_OCTAVES = 2; // two octaves + top C
const BLACK_PCS = new Set([1, 3, 6, 8, 10]);
const WHITE_ORDER = [0, 2, 4, 5, 7, 9, 11];

/** Names override lets callers pass context-aware spellings. */
export function keyboardStrip(
  highlights: Highlight[],
  opts: { names?: Map<PitchClass, string>; onClickPc?: (pc: PitchClass, ev: MouseEvent) => void; octaveStart?: number } = {},
): HTMLElement {
  const wrap = el("div", { class: "kbd" });
  const start = opts.octaveStart ?? 0;
  const whites: HTMLButtonElement[] = [];
  const nameOf = (pc: PitchClass) => opts.names?.get(pc) ?? PC_NAMES_SHARP[pc];

  // white keys
  const whiteRow = el("div", { class: "kbd-whites" });
  for (let o = 0; o < WHITE_OCTAVES; o++) {
    for (const w of WHITE_ORDER) {
      const pc = mod12(start + w);
      const key = el("button", { class: `key white ${hlClass(pc, highlights)}`, "data-pc": String(w), type: "button" }, nameOf(pc));
      wire(key, pc, opts);
      whites.push(key);
      whiteRow.appendChild(key);
    }
  }
  const lastPc = mod12(start + 0);
  whites.push(el("button", { class: `key white ${hlClass(lastPc, highlights)}`, "data-pc": "0", type: "button" }, nameOf(lastPc)));
  whiteRow.appendChild(whites[whites.length - 1]);
  wrap.appendChild(whiteRow);

  // black keys positioned absolutely over the gaps
  const blackRow = el("div", { class: "kbd-blacks" });
  let wi = 0;
  for (let o = 0; o < WHITE_OCTAVES; o++) {
    for (const w of WHITE_ORDER) {
      if (w !== 11 && BLACK_PCS.has(mod12(w + 1))) {
        const pc = mod12(start + w + 1);
        const gapPct = ((wi + 1) / (WHITE_OCTAVES * 7 + 1)) * 100;
        const key = el("button", { class: `key black ${hlClass(pc, highlights)}`, "data-pc": String(mod12(w + 1)), type: "button" }, "");
        key.style.left = `calc(${gapPct}% - 1.6%)`;
        wire(key, pc, opts);
        blackRow.appendChild(key);
      }
      wi++;
    }
  }
  wrap.appendChild(blackRow);
  return wrap;
}

/** Fretboard: horizontal strings with thickness by pitch, nut at fret 0. */
export function fretGrid(
  tuning: PitchClass[], // open-string pitch classes, high (thin) string first
  frets: number,
  highlights: Highlight[],
  opts: { onClickPc?: (pc: PitchClass, ev: MouseEvent) => void; names?: Map<PitchClass, string> } = {},
): HTMLElement {
  return renderFretboard(tuning, frets, highlights, opts);
}

/* ------------------------------------------------------------------ */
/* SVG fretboard renderer                                              */
/*                                                                     */
/* Strings are horizontal lines whose stroke width encodes gauge: the   */
/* highest-pitched string is thinnest and each successive lower string */
/* adds gaugeStepPx (configurable), up to maxStringPx. A thick nut bar */
/* marks fret 0 and open-string notes sit just behind it. Highlighted  */
/* tones render as dots centered on their string. Translucent halo     */
/* lines flank each string for a soft anti-aliased look.               */
/* ------------------------------------------------------------------ */

const NS = "http://www.w3.org/2000/svg";

export interface FretboardStyle {
  /** line width of the highest-pitched (thinnest) string, px */
  thinStringPx: number;
  /** extra px added per step down in pitch */
  gaugeStepPx: number;
  /** max total string width so very low instruments stay sane */
  maxStringPx: number;
  /** number of fret columns drawn (excluding the open/nut zone) */
  frets: number;
  /** row height per string */
  rowH: number;
  showNoteNames: boolean;
}

export const DEFAULT_FB_STYLE: FretboardStyle = {
  thinStringPx: 1.5,
  gaugeStepPx: 1,
  maxStringPx: 6,
  frets: 12,
  rowH: 26,
  showNoteNames: true,
};

let fbStyle: FretboardStyle = { ...DEFAULT_FB_STYLE };
export function setFretboardStyle(patch: Partial<FretboardStyle>): void {
  fbStyle = { ...fbStyle, ...patch };
}
export function getFretboardStyle(): FretboardStyle {
  return { ...fbStyle };
}

function svg(tag: string, attrs: Record<string, string | number>): SVGSVGElement {
  const e = document.createElementNS(NS, tag) as unknown as SVGSVGElement;
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

function hlKind(pc: PitchClass, highlights: Highlight[]): string | null {
  const hit = highlights.find((h) => h.pcs.has(mod12(pc)));
  return hit ? hit.kind : null;
}

function accidentalGlyph(name: string): string {
  return name.replace(/b/g, "\u266D").replace(/#/g, "\u266F");
}

function renderFretboard(
  tuning: PitchClass[],
  fretCount: number,
  highlights: Highlight[],
  opts: { onClickPc?: (pc: PitchClass, ev: MouseEvent) => void; names?: Map<PitchClass, string> },
): HTMLElement {
  const st = fbStyle;
  const n = tuning.length;
  const frets = Math.max(4, Math.min(st.frets, fretCount || st.frets));
  const rowH = st.rowH;
  const labelW = 30;          // left gutter for open-string note names
  const nutW = 5;             // nut bar width
  const openCol = 28;         // width of the "open" zone between nut and fret 1
  const colW = 36;            // fret column width
  const W = labelW + nutW + openCol + frets * colW;
  const H = n * rowH + 18;    // bottom margin for fret numbers
  const nutX = labelW + nutW;

  const rootEl = el("div", { class: "fretboard" });
  const s = svg("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", height: H, class: "fb-svg" });

  // fingerboard background
  s.appendChild(svg("rect", { x: nutX, y: 0, width: W - nutX, height: n * rowH, rx: 3, class: "fb-board" }));

  // nut: thick vertical bar at fret 0
  s.appendChild(svg("rect", { x: labelW, y: 1, width: nutW, height: n * rowH - 2, rx: 1.5, class: "fb-nut" }));

  // fret lines + numbers
  for (let f = 1; f <= frets; f++) {
    const x = nutX + openCol + (f - 1) * colW;
    s.appendChild(svg("line", { x1: x, y1: 1, x2: x, y2: n * rowH - 1, class: "fb-fret" }));
    const t = svg("text", { x: x - colW / 2, y: n * rowH + 13, class: "fb-num", "text-anchor": "middle" });
    t.textContent = String(f);
    s.appendChild(t);
  }

  // strings — ordered high pitch (top) to low pitch (bottom); thicker going down
  tuning.forEach((open, i) => {
    const y = i * rowH + rowH / 2;
    const w = Math.min(st.thinStringPx + i * st.gaugeStepPx, st.maxStringPx);
    s.appendChild(svg("line", { x1: labelW, y1: y, x2: W - 2, y2: y, class: "fb-string-halo", "stroke-width": w + 2 }));
    s.appendChild(svg("line", { x1: labelW, y1: y, x2: W - 2, y2: y, class: "fb-string", "stroke-width": w }));

    // open-string pitch shown behind the nut (name, or dot when highlighted)
    const kind = hlKind(open, highlights);
    if (kind && st.showNoteNames) {
      s.appendChild(svg("circle", { cx: labelW + nutW / 2, cy: y, r: 8, class: `fb-dot fb-${kind}` }));
    } else {
      const name = opts.names?.get(mod12(open)) ?? PC_NAMES_SHARP[mod12(open)];
      const t = svg("text", { x: labelW - 3, y: y + 3.5, class: "fb-open-name", "text-anchor": "end" });
      t.textContent = accidentalGlyph(name);
      s.appendChild(t);
    }
    if (opts.onClickPc) wireClick(s, svg("rect", { x: 0, y: i * rowH, width: nutX + openCol, height: rowH, class: "fb-hit" }), mod12(open), opts);
  });

  // highlighted tone dots + invisible click targets per fret cell
  tuning.forEach((open, i) => {
    const y = i * rowH + rowH / 2;
    for (let f = 1; f <= frets; f++) {
      const pc = mod12(open + f);
      const x = nutX + openCol + (f - 1) * colW;
      const cx = x - colW / 2;
      const kind = hlKind(pc, highlights);
      if (kind) {
        s.appendChild(svg("circle", { cx, cy: y, r: 9, class: `fb-dot fb-${kind}` }));
        if (st.showNoteNames) {
          const t = svg("text", { x: cx, y: y + 3, class: `fb-dot-label`, "text-anchor": "middle" });
          t.textContent = accidentalGlyph(opts.names?.get(pc) ?? PC_NAMES_SHARP[pc]);
          s.appendChild(t);
        }
      }
      if (opts.onClickPc) wireClick(s, svg("rect", { x: x - colW, y: i * rowH, width: colW, height: rowH, class: "fb-hit" }), pc, opts);
    }
  });

  rootEl.appendChild(s as unknown as HTMLElement);
  return rootEl;
}

function wireClick(parent: Element, node: SVGElement, pc: PitchClass, opts: { onClickPc?: (pc: PitchClass, ev: MouseEvent) => void }): void {
  node.style.cursor = "pointer";
  node.addEventListener("click", (ev) => opts.onClickPc?.(pc, ev as MouseEvent));
  parent.appendChild(node);
}

function hlClass(pc: PitchClass, highlights: Highlight[]): string {
  const hit = highlights.find((h) => h.pcs.has(mod12(pc)));
  return hit ? `hl-${hit.kind}` : "";
}

function wire(node: HTMLElement, pc: PitchClass, opts: { onClickPc?: (pc: PitchClass, ev: MouseEvent) => void }): void {
  if (opts.onClickPc) on(node, "click", (ev) => opts.onClickPc!(pc, ev as MouseEvent));
}
