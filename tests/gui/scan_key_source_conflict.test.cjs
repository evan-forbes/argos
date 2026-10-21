const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("gui/src/main.js", "utf8");

function loadFunction(name, context = {}) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must remain testable`);
  const nextSection = source.indexOf("\n}\n", start);
  assert.notEqual(nextSection, -1, `${name} must have a closing brace`);
  const declaration = source.slice(start, nextSection + 3);
  return vm.runInNewContext(`${declaration}; ${name}`, context);
}

test("a single key source is accepted", () => {
  const conflict = loadFunction("scanKeySourceConflict");
  assert.equal(conflict(true, false, false), null);
  assert.equal(conflict(false, true, false), null);
  assert.equal(conflict(false, false, true), null);
});

test("a wallet file combines with a pasted Sapling key, as the CLI allows", () => {
  const conflict = loadFunction("scanKeySourceConflict");
  assert.equal(conflict(false, true, true), null);
});

test("a seed phrase with a loaded wallet file is refused", () => {
  const conflict = loadFunction("scanKeySourceConflict");
  const message = conflict(true, true, false);
  assert.equal(typeof message, "string");
  assert.match(message, /seed phrase/);
  assert.match(message, /wallet file/);
});

test("a seed phrase with a pasted Sapling key is still refused", () => {
  const conflict = loadFunction("scanKeySourceConflict");
  const message = conflict(true, false, true);
  assert.equal(typeof message, "string");
  assert.match(message, /Sapling spending key/);
  assert.equal(typeof conflict(true, true, true), "string");
});

test("the start-scan handler consults the conflict check", () => {
  const start = source.indexOf('$("start-scan").addEventListener("click"');
  assert.notEqual(start, -1);
  const end = source.indexOf("\n});\n", start);
  assert.match(source.slice(start, end), /scanKeySourceConflict\(/);
});

test("Start over drops the loaded wallet file and its caveats", () => {
  const start = source.indexOf('$("restart-flow").addEventListener("click"');
  assert.notEqual(start, -1);
  const end = source.indexOf("\n});\n", start);
  const handler = source.slice(start, end);
  assert.match(handler, /forgetLoadedWalletFile\(\)/);

  const reset = loadFunction("forgetLoadedWalletFile");
  assert.match(reset.toString(), /walletFile = null;/);
  assert.match(reset.toString(), /forgetWalletCaveats\(\);/);
});
