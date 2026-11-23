import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

function harness(isGM = true, url = "https://everestkitchen.com.br/companion?player=1#home") {
  const hooks = new Map();
  const instances = [];
  const warnings = [];
  const external = [];
  const module = {};
  let setting;
  class Element {
    children = [];
    dataset = {};
    events = {};
    append(...children) { this.children.push(...children); }
    setAttribute() {}
    addEventListener(name, callback) { this.events[name] = callback; }
    querySelector() { return this.children.find(child => child.dataset.everestCompanion); }
  }
  class App {
    rendered = false;
    renders = 0;
    constructor() { instances.push(this); }
    async render() { this.renders++; this.html = await this._renderHTML(); this.rendered = true; }
    async maximize() { this.maximized = true; }
    bringToFront() { this.front = true; }
    async _onClose() {}
    async close() { await this._onClose({}); this.rendered = false; }
  }
  const game = {
    user: { isGM },
    settings: { get: () => url, register: (_id, _key, config) => { setting = config; } },
    keybindings: { register() {} },
    modules: { get: () => module },
  };
  vm.runInNewContext(readFileSync(new URL("../scripts/companion.js", import.meta.url), "utf8"), {
    game, URL, console, HTMLElement: Element,
    document: { createElement: () => new Element() },
    window: { open: (...args) => external.push(args) },
    ui: { notifications: { warn: value => warnings.push(value), error: value => { throw new Error(value); } } },
    foundry: { applications: { api: { ApplicationV2: App } } },
    Hooks: { once: (name, cb) => hooks.set(name, cb), on: (name, cb) => hooks.set(name, cb) },
  });
  hooks.get("init")();
  hooks.get("ready")();
  return { hooks, instances, warnings, external, game, api: module.api, Element, get setting() { return setting; } };
}

test("players have their companion button, cannot open the admin API or see its buttons", async () => {
  const h = harness(false);
  const controls = { tokens: { tools: {} } };
  h.hooks.get("getSceneControlButtons")(controls);
  assert.ok(controls.tokens.tools["everest-companion"]);
  assert.equal(controls.tokens.tools["everest-companion-admin"], undefined);
  const root = new h.Element();
  h.hooks.get("renderSettings")(null, root);
  assert.equal(root.children.length, 1);
  await h.api.openAdmin();
  assert.equal(h.instances.length, 0);
  assert.equal(h.warnings.length, 1);
});

test("GM button opens a separate admin iframe at the configured origin without player parameters", async () => {
  const h = harness(true, "https://custom.example/companion?key=player#screen");
  const controls = { tokens: { tools: {} } };
  h.hooks.get("getSceneControlButtons")(controls);
  await controls.tokens.tools["everest-companion-admin"].onChange();
  const admin = h.instances[0];
  assert.equal(admin.html.children[1].src, "https://custom.example/cms/companion/clock");
  assert.equal(admin.constructor.DEFAULT_OPTIONS.position.width, 1180);
  admin.html.children[0].children[0].events.click();
  assert.equal(h.external[0][0], "https://custom.example/cms/companion/clock");
  await h.api.open();
  assert.equal(h.instances.length, 2);
  assert.equal(h.instances[1].html.children[1].src, "https://custom.example/companion?key=player#screen");
  const root = new h.Element();
  h.hooks.get("renderSettings")(null, root);
  h.hooks.get("renderSettings")(null, root);
  assert.equal(root.children.length, 2);
});

test("reopening and concurrent clicks reuse the window and iframe; closing releases it", async () => {
  const h = harness();
  await Promise.all([h.api.openAdmin(), h.api.openAdmin()]);
  assert.equal(h.instances.length, 1);
  const admin = h.instances[0];
  const iframe = admin.html.children[1];
  await h.api.openAdmin();
  assert.equal(admin.renders, 1);
  assert.equal(admin.front, true);
  assert.equal((await admin._renderHTML()).children[1], iframe);
  await admin.close();
  assert.equal(admin.content, undefined);
  await h.api.openAdmin();
  assert.notEqual(admin.html.children[1], iframe);
});

test("changing companion URL closes both windows", async () => {
  const h = harness();
  await h.api.open();
  await h.api.openAdmin();
  await h.setting.onChange();
  assert.ok(h.instances.every(app => !app.rendered && !app.content));
  await h.api.openAdmin();
  assert.equal(h.instances.length, 3);
});
