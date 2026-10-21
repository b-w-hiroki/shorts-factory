const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

test("legacy key is removed unread; new key stays in memory and generation works", async () => {
  const html = fs.readFileSync(require("node:path").join(__dirname, "../index.html"), "utf8");
  const script = html.slice(html.indexOf("/* ================= Claude API mode"), html.indexOf("/* ================= schedule"));
  assert.ok(script.startsWith("/* ================= Claude API mode"));
  const values = new Map([["sf_api_key", "synthetic-legacy"]]);
  const removed = [];
  const localStorage = {
    getItem(key) { if (key === "sf_api_key") throw new Error("legacy key read"); return values.get(key); },
    setItem(key, value) { if (key === "sf_api_key") throw new Error("key persisted"); values.set(key, value); },
    removeItem(key) { removed.push(key); values.delete(key); },
  };
  const elements = {};
  const $ = (id) => elements[id] ??= {
    value: "", textContent: "",
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(_event, callback) { this.click = callback; },
  };
  let calls = 0;
  const fetch = async (_url, options) => {
    calls++;
    assert.equal(options.headers["x-api-key"], "synthetic-new");
    return { ok: true, json: async () => ({
      content: [{ text: JSON.stringify(Object.fromEntries(["a", "b", "c"].map(k => [k, { title: k, lines: [] }]))) }],
    }) };
  };
  const context = { localStorage, $, document: { querySelectorAll: () => [] }, fetch };
  vm.createContext(context);
  vm.runInContext(script, context);
  assert.ok(removed.includes("sf_api_key"));
  assert.equal(values.has("sf_api_key"), false);
  $("api-key-input").value = "synthetic-new";
  $("api-key-save").click();
  const output = await vm.runInContext("generateViaAPI({url:'https://example.test',name:'item'})", context);
  assert.deepEqual(Object.keys(output), ["a", "b", "c"]);
  assert.equal(calls, 1);
  assert.equal(values.has("sf_api_key"), false);
});
