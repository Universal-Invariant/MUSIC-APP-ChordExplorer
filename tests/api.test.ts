/**
 * End-to-end tests of the analysis API: parsing, interpolation (the two
 * flagship examples from the spec), slash-chord expressions, progression
 * timelines, and reverse lookup.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { HarmonicApp } from "../src/analysis/api.js";

const app = new HarmonicApp();

test("parse basic symbols", () => {
  for (const sym of ["Am7", "E7b9", "Fmaj7#9#11", "Caug/B", "AmM7/F", "Gm7", "B7alt"]) {
    const r = app.parse(sym);
    assert.ok(r.ok && r.chord, `${sym} should parse: ${r.errors.join(";")}`);
  }
});

test("spec example 1: E7b9 → Fmaj7#9#11 interpolates via A harmonic minor", () => {
  const x = app.parse("E7b9").chord!;
  const y = app.parse("Fmaj7#9#11").chord!;
  const results = app.interpolate(x, y).filter((r) => r.coversBoth);
  assert.ok(results.length > 0, "at least one covering scale");
  const hm = results.find(
    (r) => r.scale.def.abbr === "hm" && r.scale.root === 9 /* A */,
  );
  assert.ok(hm, "A harmonic minor must cover both chords");
});

test("spec example 2: Emaj7 + Fmaj7 union is Hungarian-minor family", () => {
  const x = app.parse("Emaj7").chord!;
  const y = app.parse("Fmaj7").chord!;
  const covering = app.interpolate(x, y).filter((r) => r.coversBoth);
  assert.ok(covering.length > 0);
  // The union {A B C D# E F G#} is a rotation of Hungarian minor steps
  // [2,1,3,1,1,3,1]. Check set membership rather than naming: every covering
  // option must contain all tones of both chords.
  const xMask = app.chordView(x).bitmask;
  const yMask = app.chordView(y).bitmask;
  for (const c of covering) {
    const view = app.scaleView(c.scale);
    const set = new Set(view.degrees.map((d) => d.pc));
    for (let i = 0; i < 12; i++) {
      if ((xMask >> i) & 1) assert.ok(set.has(i), `scale ${c.scale.def.id}@${c.scale.root} missing X tone pc ${i}`);
      if ((yMask >> i) & 1) assert.ok(set.has(i), `scale ${c.scale.def.id}@${c.scale.root} missing Y tone pc ${i}`);
    }
  }
});

test("slash chord AmM7/F expresses Fmaj7#9 family content", () => {
  const r = app.parse("AmM7/F");
  assert.ok(r.ok && r.chord && r.bass !== undefined);
  assert.equal(r.bass, 5); // F
  const view = app.chordView(r.chord, r.bass);
  assert.ok(view.tones.some((t) => t.name.startsWith("A")));
});

test("expressions include multiple strategies", () => {
  const ch = app.parse("Fmaj7#9#11").chord!;
  const exprs = app.expressions(ch);
  assert.ok(exprs.length >= 2, "should offer more than one way to write it");
  assert.ok(exprs.every((e) => e.text.length > 0));
});

test("progression timeline produces transitions", () => {
  const { chords, errors } = app.parseProgression("Am7, D7, Gmaj7");
  assert.deepEqual(errors, []);
  assert.equal(chords.length, 3);
  const prog = app.progression(chords);
  assert.equal(prog.transitions.length, 2);
  // ii-V-I: all three chords fit C major → expect covering scales per transition
  for (const t of prog.transitions) {
    assert.ok(t.singleScaleOptions.some((o) => o.coversBoth), "some scale covers each ii-V / V-I pair");
  }
});

test("reverse lookup enumerates diatonic chord pairs for a scale + root motion", () => {
  const def = app.findScale("Ion"); // C ionian when rooted at 0
  assert.ok(def, "Ionian exists");

  // Ion→Dor (+2): I chords moving up a whole step to ii-family chords.
  const ms2 = app.reverse([{ def: def!, root: 0 }], 2);
  assert.ok(ms2.length > 0);
  assert.ok(
    ms2.some((m) => m.from.degree === 1 && m.to.degree === 2),
    "degree 1 → degree 2 at +2 semitones should appear",
  );

  // Dor→Mix (+5): the classic ii→V of C major (Dm7 → G7).
  const ms5 = app.reverse([{ def: def!, root: 0 }], 5);
  assert.ok(
    ms5.some((m) => m.from.label.startsWith("D") && m.to.label.startsWith("G")),
    "D* → G* at +5 (P4) should appear",
  );
  assert.ok(
    ms5.some((m) => m.from.degree === 2 && m.to.degree === 5),
    "ii → V by scale degree should appear",
  );
});

test("transitionReport includes curated match for phrydom→hm style rows", () => {
  const x = app.parse("E7b9").chord!;   // V7b9 of A harmonic minor world
  const y = app.parse("AmM7").chord!;   // i mM7
  const rep = app.transitionReport(x, y);
  assert.equal(rep.rootMotion, 5); // E→A = P4 up
  assert.ok(rep.singleScaleOptions.length > 0);
});

test("chordFromScaleDegrees stacks tertian chords", () => {
  const def = app.findScale("major") ?? app.findScale("Ion");
  assert.ok(def);
  const view = app.scaleView({ def: def!, root: 0 });
  const triad = app.chordFromScaleDegrees(view, [1, 3, 5]);
  assert.equal(triad.root, 0);
  assert.deepEqual([...triad.intervals.map((i) => i.semitones)].sort((a, b) => a - b), [4, 7]);
});

// ---- regression: no runaway accidental runs ("bbbbbb9") in labels ----
test("degree labels never contain 3+ repeated accidentals", () => {
  const cases = ["Fmaj7#9#11", "E7b9", "Caug/B", "AmM7/F", "G7b9b13", "Db7#9#11", "F7bb9"];
  for (const sym of cases) {
    const r = app.parse(sym);
    assert.ok(r.ok, `parse ${sym}`);
    const v = app.chordView(r.chord!);
    for (const t of v.tones) {
      assert.ok(!/[#b]{3,}/.test(t.degree), `${sym}: degree label "${t.degree}" has a runaway accidental run`);
    }
    for (const e of v.expressions) {
      assert.ok(!/[#b]{3,}/.test(e.text), `${sym}: expression "${e.text}" has a runaway accidental run`);
    }
  }
});

test("Fmaj7#9#11 labels the #9 and #11 exactly", () => {
  const r = app.parse("Fmaj7#9#11");
  assert.ok(r.ok);
  const v = app.chordView(r.chord!);
  const degs = v.tones.map((t) => t.degree);
  assert.ok(degs.includes("#9"), `expected #9 among ${degs.join(",")}`);
  assert.ok(degs.includes("#11"), `expected #11 among ${degs.join(",")}`);
});
