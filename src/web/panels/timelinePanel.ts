/**
 * Timeline panel: the chord progression editor. Each slot is an editable
 * chord symbol with a beat-length selector; between consecutive chords we
 * render a TRANSITION card listing interpolating scales (single-scale first,
 * two-scale fallbacks after) plus curated relationship hits. Clicking a
 * scale option makes it the active scale in the scale panel.
 */
import { mod12, PitchClass } from "../../core/pitch.js";
import { InterpolationResult, TwoScaleOption } from "../../analysis/engine.js";
import { ChordRelationship } from "../../catalog/relationships.js";
import { Store, TransitionView } from "../state.js";
import { el, clear, on } from "../dom.js";
import { chordCard } from "./chordPanel.js";
import { Highlight } from "./visual.js";
import { getVisualizer } from "../instruments.js";

const MOTION_NAMES = ["unison", "m2", "M2", "m3", "M3", "P4", "TT", "P5", "m6", "M6", "m7", "M7"];

export function mountTimelinePanel(root: HTMLElement, store: Store): void {
  const render = () => draw(root, store);
  render();
  store.subscribe(render);
}

function draw(root: HTMLElement, store: Store): void {
  clear(root);
  root.appendChild(el("h2", {}, "Progression timeline"));

  /* ---- quick load bar ---- */
  const bar = el("div", { class: "btn-row" });
  const input = el("input", { class: "input wide", placeholder: "e.g. Am7, D7, Gmaj7 | Fmaj7#9#11", type: "text" }) as HTMLInputElement;
  const loadBtn = el("button", { class: "btn primary", type: "button" }, "Load");
  const doLoad = () => { if (input.value.trim()) store.loadProgression(input.value); };
  on(loadBtn, "click", doLoad);
  on(input, "keydown", (ev) => { if ((ev as KeyboardEvent).key === "Enter") doLoad(); });
  bar.appendChild(input);
  bar.appendChild(loadBtn);
  const addBtn = el("button", { class: "btn", type: "button" }, "+ Add chord");
  on(addBtn, "click", () => store.addSlot(""));
  bar.appendChild(addBtn);
  root.appendChild(bar);

  if (!store.timeline.length) {
    root.appendChild(el("div", { class: "muted" }, "No chords yet — load a progression or add a chord."));
    return;
  }

  /* ---- slots + transitions ---- */
  const views = store.chordViews();
  const transitions = store.transitions();
  const track = el("div", { class: "track" });

  store.timeline.forEach((slot, i) => {
    track.appendChild(slotCard(store, slot, views[i], i));
    const tr = transitions.find((t) => t.index === i);
    if (tr) track.appendChild(transitionCard(store, tr));
  });
  root.appendChild(track);
}

/* ------------------------------------------------------------------ */

function slotCard(store: Store, slot: { id: number; symbol: string; error?: string }, view: ReturnType<Store["chordViews"]>[number], index: number): HTMLElement {
  const card = el("div", { class: `slot ${slot.error ? "bad" : ""}` });
  card.appendChild(el("div", { class: "slot-idx" }, String(index + 1)));
  const inp = el("input", { class: "input sym", value: slot.symbol, placeholder: "Am7", type: "text" }) as HTMLInputElement;
  on(inp, "change", () => store.setSymbol(slot.id, inp.value));
  card.appendChild(inp);
  if (slot.error) card.appendChild(el("div", { class: "error small" }, slot.error));

  // beats selector
  const beatsSel = el("select", { class: "input beats" }) as HTMLSelectElement;
  for (const b of [1, 2, 3, 4]) {
    const o = el("option", { value: String(b) }, `${b} beat${b > 1 ? "s" : ""}`) as HTMLOptionElement;
    if ((store.beats[index] ?? 4) === b) o.selected = true;
    beatsSel.appendChild(o);
  }
  on(beatsSel, "change", () => store.setBeats(index, parseInt(beatsSel.value, 10)));
  card.appendChild(beatsSel);

  const rm = el("button", { class: "btn tiny danger", type: "button" }, "×");
  on(rm, "click", () => store.removeSlot(slot.id));
  card.appendChild(rm);

  if (view) card.appendChild(chordCard(view, store));
  return card;
}

function transitionCard(store: Store, tr: TransitionView): HTMLElement {
  const card = el("div", { class: "transition" });
  const r = tr.report;
  const motionTxt = MOTION_NAMES[mod12(r.rootMotion)] ?? `${r.rootMotion}st`;
  card.appendChild(el("div", { class: "tr-head" }, `Transition ${tr.index + 1}: `, el("code", {}, r.fromSymbol), " → ", el("code", {}, r.toSymbol), ` · root motion +${motionTxt}`));

  if (r.curatedMatches.length) {
    const cur = el("div", { class: "curated" });
    cur.appendChild(el("span", { class: "tag" }, "curated"));
    for (const m of r.curatedMatches) cur.appendChild(curatedLine(m));
    card.appendChild(cur);
  }

  if (r.singleScaleOptions.length) {
    const list = el("div", { class: "scale-options" });
    list.appendChild(el("h4", {}, `Single interpolating scales (${r.singleScaleOptions.length})`));
    for (const opt of r.singleScaleOptions.slice(0, 10)) list.appendChild(scaleOptionRow(store, opt));
    card.appendChild(list);
  } else if (r.twoScaleFallback.length) {
    const list = el("div", { class: "scale-options" });
    list.appendChild(el("h4", {}, "No single scale fits both — natural two-scale pairings:"));
    for (const opt of r.twoScaleFallback.slice(0, 8)) list.appendChild(twoScaleRow(store, opt));
    card.appendChild(list);
  } else {
    card.appendChild(el("div", { class: "muted" }, "No scale options found."));
  }
  return card;
}

function curatedLine(m: ChordRelationship): HTMLElement {
  return el("div", { class: "small" }, `${m.parentScaleId}: ${m.fromModeAbbr} → ${m.toModeAbbr}`);
}

function scaleOptionRow(store: Store, opt: InterpolationResult): HTMLElement {
  const row = el("div", { class: "opt-row" });
  const inst = opt.scale;
  const view = store.app.scaleView(inst);
  const label = el("button", { class: "btn link", type: "button" }, `${view.rootName} ${inst.def.name}`);
  on(label, "click", () => store.setActiveScale(inst));
  row.appendChild(label);
  row.appendChild(el("span", { class: `nat nat-${opt.naturalness}` }, opt.naturalness));
  row.appendChild(el("span", { class: "muted small" }, ` deg ${opt.detail.fromDegree ?? "?"}→${opt.detail.toDegree ?? "?"} · score ${opt.score.toFixed(1)}`));
  // mini visualizer of the scale (respects active instrument)
  const hl: Highlight[] = [{ pcs: new Set(view.degrees.map((d) => d.pc)), kind: "scale" }];
  const names = new Map<PitchClass, string>();
  for (const d of view.degrees) names.set(mod12(d.pc), d.name);
  const mini = getVisualizer(store.instrumentId).render({ highlights: hl, names });
  mini.classList.add("mini");
  row.appendChild(mini);
  return row;
}

function twoScaleRow(store: Store, opt: TwoScaleOption): HTMLElement {
  const row = el("div", { class: "opt-row" });
  const v1 = store.app.scaleView(opt.first);
  const v2 = store.app.scaleView(opt.second);
  const b1 = el("button", { class: "btn link", type: "button" }, `${v1.rootName} ${opt.first.def.name}`);
  on(b1, "click", () => store.setActiveScale(opt.first));
  const b2 = el("button", { class: "btn link", type: "button" }, `${v2.rootName} ${opt.second.def.name}`);
  on(b2, "click", () => store.setActiveScale(opt.second));
  row.appendChild(b1);
  row.appendChild(el("span", { class: "muted" }, " → "));
  row.appendChild(b2);
  row.appendChild(el("span", { class: "muted small" }, ` (${opt.sharedTones} shared tones)`));
  return row;
}
