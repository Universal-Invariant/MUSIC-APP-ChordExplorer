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
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
