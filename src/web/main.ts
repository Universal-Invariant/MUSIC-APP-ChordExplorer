/**
 * App entry point for the browser build. Wires the store and panels into
 * index.html. Panels are mounted once and re-render themselves on store
 * changes — adding a new panel is a one-line change here.
 */
import { HarmonicApp } from "../analysis/api.js";
import { Store } from "./state.js";
import { mountChordPanel } from "./panels/chordPanel.js";
import { mountScalePanel } from "./panels/scalePanel.js";
import { mountTimelinePanel } from "./panels/timelinePanel.js";
import { mountReversePanel, mountExplorerPanel } from "./panels/reversePanel.js";
import { el, on } from "./dom.js";
import { BUILD_INFO } from "./buildinfo.generated.js";
import { DEFAULT_FB_STYLE, getFretboardStyle, setFretboardStyle, type FretboardStyle } from "./panels/visual.js";

/* ------------------------------------------------------------------ */
/* build stamp: unobtrusive footer + About dialog                      */
/* ------------------------------------------------------------------ */

function fmtBuilt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function installBuildStamp(rerender: () => void): void {
  const foot = document.querySelector("footer p");
  if (foot) {
    const stamp = el("span", { class: "build-stamp" }, ` · v${BUILD_INFO.commit}${BUILD_INFO.dirty ? "*" : ""} · ${fmtBuilt(BUILD_INFO.builtAt)}`);
    foot.appendChild(document.createTextNode(" "));
    foot.appendChild(stamp);
    const aboutBtn = el("button", { class: "link like", type: "button" }, "About / Settings");
    aboutBtn.style.marginLeft = "8px";
    on(aboutBtn, "click", () => showAbout(rerender));
    foot.appendChild(aboutBtn);
  }
}

function showAbout(rerender: () => void): void {
  const dlgId = "about-dialog";
  let dlg = document.getElementById(dlgId) as HTMLDialogElement | null;
  if (dlg) { dlg.showModal(); return; }

  dlg = el("dialog", { id: dlgId, class: "about" }) as HTMLDialogElement;
  const st = getFretboardStyle();
  const field = (label: string, input: HTMLElement) => {
    const row = el("label", { class: "about-row" });
    row.appendChild(el("span", {}, label));
    row.appendChild(input);
    return row;
  };
  const num = (key: keyof FretboardStyle, min: number, max: number, step: number, value: number) => {
    const inp = el("input", { type: "number", min: String(min), max: String(max), step: String(step), value: String(value) }) as HTMLInputElement;
    on(inp, "change", () => {
      const v = parseFloat(inp.value);
      if (!Number.isNaN(v)) { setFretboardStyle({ [key]: v } as Partial<FretboardStyle>); rerender(); }
    });
    return inp;
  };
  const chk = (checked: boolean) => {
    const inp = el("input", { type: "checkbox" }) as HTMLInputElement;
    inp.checked = checked;
    on(inp, "change", () => { setFretboardStyle({ showNoteNames: inp.checked }); rerender(); });
    return inp;
  };

  const box = el("div", {});
  box.appendChild(el("h3", {}, "About & instrument settings"));
  const dl = el("dl", { class: "about-meta" });
  for (const [k, v] of [
    ["Commit", `${BUILD_INFO.commit}${BUILD_INFO.dirty ? " (working tree dirty)" : ""}`],
    ["Branch", BUILD_INFO.branch || "—"],
    ["Built", fmtBuilt(BUILD_INFO.builtAt)],
  ] as [string, string][]) {
    dl.appendChild(el("dt", {}, k));
    dl.appendChild(el("dd", {}, v));
  }
  box.appendChild(dl);

  box.appendChild(el("h4", {}, "Stringed visualizer"));
  box.appendChild(field("Thinnest string (px)", num("thinStringPx", 0.5, 4, 0.25, st.thinStringPx)));
  box.appendChild(field("Gauge step per string (px)", num("gaugeStepPx", 0, 3, 0.25, st.gaugeStepPx)));
  box.appendChild(field("Max string width (px)", num("maxStringPx", 2, 12, 0.5, st.maxStringPx)));
  box.appendChild(field("Frets shown", num("frets", 4, 24, 1, st.frets)));
  box.appendChild(field("String spacing (px)", num("rowH", 16, 48, 1, st.rowH)));
  box.appendChild(field("Show note names", chk(st.showNoteNames)));

  const reset = el("button", { class: "btn", type: "button" }, "Reset defaults");
  on(reset, "click", () => { setFretboardStyle(DEFAULT_FB_STYLE); rerender(); dlg!.close(); });
  const close = el("button", { class: "btn primary", type: "button" }, "Close");
  on(close, "click", () => dlg!.close());
  const btns = el("div", { class: "btn-row" });
  btns.appendChild(reset); btns.appendChild(close);
  box.appendChild(btns);

  dlg.appendChild(box);
  document.body.appendChild(dlg);
  dlg.showModal();
}

function main(): void {
  const app = new HarmonicApp();
  const store = new Store(app);

  const timelineRoot = document.getElementById("panel-timeline")!;
  const chordRoot = document.getElementById("panel-chord")!;
  const scaleRoot = document.getElementById("panel-scale")!;
  const reverseRoot = document.getElementById("panel-reverse")!;
  const exploreRoot = document.getElementById("panel-explore")!;

  mountTimelinePanel(timelineRoot, store);
  mountChordPanel(chordRoot, store);
  mountScalePanel(scaleRoot, store);
  mountReversePanel(reverseRoot, store);
  mountExplorerPanel(exploreRoot, store);

  // mode tabs control which analysis column is shown
  const tabs = document.getElementById("mode-tabs")!;
  const mkTab = (id: "interpolate" | "reverse" | "explore", label: string) => {
    const b = el("button", { class: `tab ${store.mode === id ? "active" : ""}`, type: "button" }, label);
    on(b, "click", () => {
      store.setMode(id);
      for (const child of Array.from(tabs.children)) child.classList.toggle("active", child === b);
      reverseRoot.style.display = id === "reverse" ? "" : "none";
      exploreRoot.style.display = id === "explore" ? "" : "none";
    });
    tabs.appendChild(b);
  };
  mkTab("interpolate", "Interpolate");
  mkTab("reverse", "Reverse lookup");
  mkTab("explore", "Expressions");
  reverseRoot.style.display = "none";
  exploreRoot.style.display = "none";

  // seed with an example progression so the app opens with content
  store.loadProgression("E7b9, Fmaj7#9#11");

  // footer build stamp + About/Settings dialog; rerender redraws all panels
  installBuildStamp(() => store.notify());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
