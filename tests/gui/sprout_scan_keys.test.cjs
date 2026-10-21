const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("gui/src/main.js", "utf8");

function loadFunctions(names, context) {
  const declarations = names.map((name) => {
    const start = source.indexOf(`function ${name}(`);
    assert.notEqual(start, -1, `${name} must remain testable`);
    const end = source.indexOf("\n}\n", start);
    assert.notEqual(end, -1, `${name} must have a closing brace`);
    return source.slice(start, end + 3);
  });
  return vm.runInNewContext(`${declarations.join("\n")}; ({ ${names.join(", ")} })`, context);
}

function load(text) {
  return loadFunctions(
    ["sproutScanKeyLines", "sproutScanKeyEntries", "sproutScanKeys"],
    { $: () => ({ value: text }) },
  );
}

test("sproutScanKeys skips blank lines and # comments like the CLI key file", () => {
  const { sproutScanKeys } = load("# my keys\n\nSKone\n   \nSKtwo\n");
  assert.deepEqual([...sproutScanKeys()], ["SKone", "SKtwo"]);
});

test("sproutScanKeys skips an indented comment and trims keys", () => {
  const { sproutScanKeys } = load("   # indented note\n  SKone  \n\t# tabbed\nSKtwo");
  assert.deepEqual([...sproutScanKeys()], ["SKone", "SKtwo"]);
});

test("sproutScanKeys keeps keys in order and returns nothing for a comment-only box", () => {
  assert.deepEqual([...load("SKc\nSKa\nSKb").sproutScanKeys()], ["SKc", "SKa", "SKb"]);
  assert.deepEqual([...load("# only\n\n# comments").sproutScanKeys()], []);
});

test("sproutScanKeyEntries reports the textarea line each key sits on", () => {
  const { sproutScanKeyEntries } = load("# note\n\nSKone\n# mid\nSKtwo");
  assert.deepEqual(
    JSON.parse(JSON.stringify(sproutScanKeyEntries())),
    [{ key: "SKone", line: 3 }, { key: "SKtwo", line: 5 }],
  );
});

test("sproutScanKeyLines is unfiltered so the backend numbers by visible line", () => {
  const { sproutScanKeyLines } = load("# note\n\nSKone");
  assert.deepEqual([...sproutScanKeyLines()], ["# note", "", "SKone"]);
});
