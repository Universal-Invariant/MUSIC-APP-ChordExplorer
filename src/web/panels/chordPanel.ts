/**
 * Chord panel: visualizes a chord (keyboard + degrees table) and lets the
 * user BUILD chords by clicking keys. Click = toggle tone, shift-click =
 * set root, alt-click = set slash bass. Also renders any ChordView passed
 * to it (timeline slots, selection, candidates).
 */
import { mod12, PitchClass } from "../../core/pitch.js";
import { ChordView } from "../../analysis/api.js";
import { Store } from "../state.js";
import { el, clear, on } from "../dom.js";
import { Highlight } from "./visual.js";
import { getVisualizer, instrumentPicker } from "../instruments.js";

export function mountChordPanel(root: HTMLElement, store: Store): void {
  const render = () => draw(root, store);
  render();
  store.subscribe(render);
}

function draw(root: HTMLElement, store: Store): void {
  clear(root);
  root.appendChild(el("h2", {}, "Chord builder"));

  /* ---- interactive visualizer (piano / guitar / strings) ---- */
  const sel = store.selection;
  const highlights: Highlight[] = [];
  if (store.activeScale) {
    highlights.push({ pcs: new Set(store.app.scaleView(store.activeScale).degrees.map((d) => d.pc)), kind: "scale" });
  }
  highlights.push({ pcs: new Set([...sel.pcs].filter((p) => p !== sel.root && p !== sel.bass)), kind: "tone" });
  if (sel.root !== null) highlights.push({ pcs: new Set([sel.root]), kind: "root" });
  if (sel.bass !== null) highlights.push({ pcs: new Set([sel.bass]), kind: "bass" });

  const view = store.selectionChordView();
  const names = view ? nameMap(view) : undefined;

  root.appendChild(instrumentPicker(store.instrumentId, (id) => store.setInstrument(id)));

  const clickPc = (pc: PitchClass, ev: MouseEvent) => {
    if (ev.shiftKey) store.setRoot(pc);
    else if (ev.altKey || ev.metaKey) store.toggleBass(pc);
    else store.togglePc(pc);
  };
  const viz = getVisualizer(store.instrumentId);
  root.appendChild(viz.render({ highlights, names, onClickPc: clickPc }));
  root.appendChild(el("div", { class: "hint" }, "click = add/remove tone · shift+click = root · alt/⌘+click = slash bass"));

  /* ---- action buttons ---- */
  const btns = el("div", { class: "btn-row" });
  const commitBtn = el("button", { class: "btn primary", type: "button" }, "Add to timeline");
  on(commitBtn, "click", () => store.commitSelectionToTimeline());
  const clearBtn = el("button", { class: "btn", type: "button" }, "Clear");
  on(clearBtn, "click", () => store.clearSelection());
  btns.appendChild(commitBtn);
  btns.appendChild(clearBtn);
  root.appendChild(btns);

  /* ---- built-chord readout ---- */
  if (view) {
    root.appendChild(chordCard(view, store, true));
  } else if (sel.pcs.size > 0) {
    root.appendChild(el("div", { class: "muted" }, "Select at least one more tone above the root."));
  }
  if (store.lastError) root.appendChild(el("div", { class: "error" }, store.lastError));
}

/** Render a static chord card for a given ChordView (used by other panels too). */
export function chordCard(view: ChordView, store: Store, showExpressions = false): HTMLElement {
  const card = el("div", { class: "chord-card" });
  const title = el("div", { class: "chord-title" }, `${view.rootName}${view.quality !== "none" ? " " + view.quality : ""}`);
  if (view.bassName) title.appendChild(el("span", { class: "bass-tag" }, ` / ${view.bassName}`));
  card.appendChild(title);

  // degree chips
  const chips = el("div", { class: "chips" });
  for (const t of view.tones) {
    const c = el("span", { class: `chip ${t.degree === "1" ? "chip-root" : ""}` }, `${t.name}`, el("small", {}, ` ${t.degree}`));
    chips.appendChild(c);
  }
  card.appendChild(chips);

  // mini keyboard
  const hl: Highlight[] = [
    { pcs: new Set(view.tones.filter((t) => t.degree !== "1").map((t) => t.pc)), kind: "tone" },
    { pcs: new Set([view.root]), kind: "root" },
  ];
  if (view.bass !== undefined) hl.push({ pcs: new Set([view.bass]), kind: "bass" });
  card.appendChild(getVisualizer(store.instrumentId).render({ highlights: hl, names: nameMap(view) }));

  if (showExpressions && view.expressions.length) {
    const expr = el("div", { class: "expr-list" });
    expr.appendChild(el("h4", {}, "Ways to write this chord"));
    const ul = el("ul");
    for (const e of view.expressions) ul.appendChild(el("li", {}, el("code", {}, e.text), " ", el("small", { class: "muted" }, `(${e.strategy})`)));
    expr.appendChild(ul);
    card.appendChild(expr);
  }
  return card;
}

function nameMap(view: ChordView): Map<PitchClass, string> {
  const m = new Map<PitchClass, string>();
  for (const t of view.tones) m.set(mod12(t.pc), t.name);
  return m;
}
