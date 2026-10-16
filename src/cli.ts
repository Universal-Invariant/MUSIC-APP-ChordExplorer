/**
 * CLI presentation layer. This is intentionally thin — it renders whatever the
 * HarmonicApp facade returns. A web UI can reuse the same facade.
 *
 * Usage:
 *   node dist/cli.js interpolate "E7b9" "Fmaj7#9#11" [--top N]
 *   node dist/cli.js progression "Am7, D7, Gmaj7, Cmaj7"
 *   node dist/cli.js reverse --scale "phrydom/A" --motion 5 [--scale2 ...]
 *   node dist/cli.js expressions "Caug/B"
 *   node dist/cli.js relationships --from dom7 --to mM7
 */
import { HarmonicApp } from "./analysis/api.js";
import { findScale } from "./catalog/scales.js";
import { parseNote } from "./theory/parser.js";
import { ScaleInstance } from "./theory/scale.js";
import { mod12 } from "./core/pitch.js";

const app = new HarmonicApp();

function noteName(pc: number): string {
  return ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"][mod12(pc)];
}

function motionLabel(semis: number): string {
  const names: Record<number, string> = {
    0: "P1", 1: "m2", 2: "M2", 3: "m3", 4: "M3", 5: "P4", 6: "TT",
    7: "P5", 8: "m6", 9: "M6", 10: "m7", 11: "M7",
  };
  return `+${semis} ${names[semis] ?? "?"}`;
}

function scaleLabel(inst: ScaleInstance): string {
  return `${noteName(inst.root)} ${inst.def.name}${inst.def.note ? ` (${inst.def.abbr})` : ""}`;
}

function flag(name: string, args: string[]): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

function cmdInterpolate(args: string[]) {
  const [xText, yText] = args.filter((a) => !a.startsWith("--"));
  if (!xText || !yText) return console.log("usage: interpolate <X> <Y> [--top N]");
  const px = app.parse(xText), py = app.parse(yText);
  if (!px.ok || !py.ok) return console.log("parse errors:", px.errors, py.errors);
  const top = parseInt(flag("top", args) ?? "12", 10);
  const report = app.transitionReport(px.chord!, py.chord!);
  console.log(`Transition: ${xText} -> ${yText}   root motion ${motionLabel(report.rootMotion)}`);
  console.log("");
  if (report.singleScaleOptions.length) {
    console.log(`Single-scale interpolations (${report.singleScaleOptions.length} shown of more):`);
    for (const r of report.singleScaleOptions.slice(0, top)) {
      const d = r.detail;
      console.log(
        `  • ${scaleLabel(r.scale).padEnd(46)} degrees ${d.fromDegree ?? "?"}->${d.toDegree ?? "?"} [${r.naturalness}]`,
      );
    }
  } else {
    console.log("No single scale contains both chords.");
  }
  if (report.twoScaleFallback.length) {
    console.log("\nTwo-scale fallbacks (most shared tones first):");
    for (const t of report.twoScaleFallback.slice(0, Math.min(top, 8))) {
      console.log(`  • ${scaleLabel(t.first)}  |  ${scaleLabel(t.second)}   (${t.sharedTones} shared — ${t.note})`);
    }
  }
  if (report.curatedMatches.length) {
    console.log("\nCurated relationship matches:");
    for (const c of report.curatedMatches) {
      console.log(`  • ${c.parentScaleId}: ${c.fromFormula} -> ${c.toFormula}  ${c.fromModeAbbr} -> ${c.toModeAbbr}`);
    }
  }
  console.log("\nAlternative expressions:");
  console.table(app.expressions(px.chord!));
  console.table(app.expressions(py.chord!));
}

function cmdProgression(args: string[]) {
  const text = args.filter((a) => !a.startsWith("--"))[0];
  if (!text) return console.log('usage: progression "Am7, D7, Gmaj7"');
  const { chords, errors } = app.parseProgression(text);
  if (errors.length) console.log("warnings:", errors);
  if (chords.length < 2) return console.log("need at least two chords");
  const analysis = app.progression(chords);
  console.log(`Timeline: ${chords.map((c) => c.source).join("  ->  ")}`);
  for (const tr of analysis.transitions) {
    console.log(`\n── Transition ${tr.index + 1}: ${tr.from.source} -> ${tr.to.source} (${motionLabel(tr.rootMotion)})`);
    const strong = tr.singleScaleOptions.filter((s) => s.coversBoth);
    if (strong.length) {
      console.log(`   ${strong.length} single-scale option(s), best:`);
      for (const r of strong.slice(0, 5)) {
        console.log(`     • ${scaleLabel(r.scale)}  degrees ${r.detail.fromDegree}->${r.detail.toDegree}`);
      }
    } else {
      console.log("   no single scale fits — two-scale options:");
      for (const t of tr.twoScaleFallback.slice(0, 4)) {
        console.log(`     • ${scaleLabel(t.first)} | ${scaleLabel(t.second)} (${t.sharedTones} shared)`);
      }
    }
  }
}

function cmdReverse(args: string[]) {
  const s1 = flag("scale", args);
  const s2 = flag("scale2", args);
  const motionText = flag("motion", args);
  if (!s1 || motionText === undefined) {
    return console.log('usage: reverse --scale "phrydom/A" [--scale2 "hm/C"] --motion 5');
  }
  const inst = parseScaleSpec(s1);
  if (!inst) return console.log(`unknown scale spec "${s1}" (try "abbr/Root" or "id Root")`);
  const scales = [inst];
  if (s2) {
    const second = parseScaleSpec(s2);
    if (!second) return console.log(`unknown scale spec "${s2}"`);
    scales.push(second);
  }
  const motion = parseInt(motionText, 10);
  const matches = app.reverse(scales, motion);
  console.log(`Chord pairs over ${scales.map(scaleLabel).join(" / ")} with root motion ${motionLabel(motion)} (${matches.length}):`);
  for (const m of matches.slice(0, 60)) {
    console.log(`  • ${m.from.label.padEnd(12)} @deg${m.from.degree} -> ${m.to.label.padEnd(12)} @deg${m.to.degree}`);
  }
}

function parseScaleSpec(spec: string): ScaleInstance | null {
  // "abbr/Root" e.g. phrydom/A ; or "Root name" e.g. "A harmonic minor"
  const slash = spec.lastIndexOf("/");
  if (slash > 0) {
    const def = findScale(spec.slice(0, slash).trim());
    const root = parseNote(spec.slice(slash + 1).trim());
    if (def && root !== null) return { def, root };
    return null;
  }
  const m = /^([A-G][#b]?)[\s-]+(.*)$/.exec(spec.trim());
  if (m) {
    const def = findScale(m[2]);
    const root = parseNote(m[1]);
    if (def && root !== null) return { def, root };
  }
  return null;
}

function cmdExpressions(args: string[]) {
  const text = args.filter((a) => !a.startsWith("--"))[0];
  if (!text) return console.log('usage: expressions "Caug/B"');
  const p = app.parse(text);
  if (!p.ok || !p.chord) return console.log("parse errors:", p.errors);
  console.log(`Equivalent expressions for ${text}:`);
  console.table(app.expressions(p.chord));
}

function cmdRelationships(args: string[]) {
  const from = flag("from", args);
  const to = flag("to", args);
  let rows = app.relationshipTable();
  if (from) rows = rows.filter((r) => r.fromFormula === from);
  if (to) rows = rows.filter((r) => r.toFormula === to);
  console.table(rows.map((r) => ({
    family: r.parentScaleId, from: r.fromFormula, to: r.toFormula,
    motion: motionLabel(r.rootMotion), modes: `${r.fromModeAbbr} -> ${r.toModeAbbr}`,
  })));
}

function main() {
  const [cmd, ...args] = process.argv.slice(2);
  switch (cmd) {
    case "interpolate": return cmdInterpolate(args);
    case "progression": return cmdProgression(args);
    case "reverse": return cmdReverse(args);
    case "expressions": return cmdExpressions(args);
    case "relationships": return cmdRelationships(args);
    default:
      console.log(`harmonic-app — chord/scale interpolation

commands:
  interpolate <X> <Y> [--top N]     scales that fit both chords (+fallbacks)
  progression "<X>, <Y>, <Z>"        timeline of transitions
  reverse --scale S [--scale2 S2] --motion N   chords fitting scale(s)+motion
  expressions <symbol>               alternative ways to write a chord
  relationships [--from F] [--to T]  curated relationship table
`);
  }
}

main();
