const MODULE_ID = "everest-companion";
const DEFAULT_URL = "https://everestkitchen.com.br/companion";
let companion;
let opening;

function companionUrl() {
  const url = new URL(game.settings.get(MODULE_ID, "url"));
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Informe uma URL HTTPS válida para o companion.");
  }
  return url.href;
}

function openExternal() {
  window.open(companionUrl(), "_blank", "noopener,noreferrer");
}

async function openCompanion() {
  if (opening) return opening;
  opening = (async () => {
    try {
      companionUrl();
      companion ??= new CompanionWindow();
      if (companion.rendered) {
        await companion.maximize();
        companion.bringToFront();
      } else {
        await companion.render({ force: true });
      }
    } catch (error) {
      console.error(`${MODULE_ID} |`, error);
      ui.notifications.error(error.message);
    }
  })();
  try {
    await opening;
  } finally {
    opening = undefined;
  }
}

class CompanionWindow extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "everest-companion-window",
    classes: ["everest-companion-window"],
    window: {
      title: "Vampire Companion",
      icon: "fa-solid fa-mobile-screen-button",
      resizable: true,
      minimizable: true,
    },
    position: { width: 460, height: 820 },
  };

  async _renderHTML() {
    // Keep the same iframe during window updates: no extra app or SSE connection.
    if (this.content) return this.content;
    const content = document.createElement("div");
    content.className = "everest-companion-content";

    const toolbar = document.createElement("nav");
    toolbar.className = "everest-companion-toolbar";
    toolbar.setAttribute("aria-label", "Companion");
    const external = document.createElement("button");
    external.type = "button";
    external.textContent = "Abrir em outra aba";
    external.addEventListener("click", openExternal);
    toolbar.append(external);

    const iframe = document.createElement("iframe");
    iframe.title = "Vampire Companion";
    iframe.src = companionUrl();
    iframe.allow = "autoplay";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    // Same-site HttpOnly session stays entirely on the companion server.
    // Do not sandbox to an opaque origin: it would break authentication.
    content.append(toolbar, iframe);
    this.content = content;
    return content;
  }

  _replaceHTML(result, content) {
    if (content.firstElementChild !== result) content.replaceChildren(result);
  }

  async _onClose(options) {
    await super._onClose(options);
    this.content = undefined;
  }
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "url", {
    name: "Endereço do companion",
    hint: "Use HTTPS. Para manter a sessão atual, Foundry e companion devem usar o mesmo domínio base e HTTPS.",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULT_URL,
    onChange: async () => {
      if (companion) await companion.close();
      companion = undefined;
    },
  });
  game.keybindings.register(MODULE_ID, "open", {
    name: "Abrir Vampire Companion",
    editable: [{ key: "KeyC", modifiers: ["SHIFT"] }],
    onDown: () => {
      void openCompanion();
      return true;
    },
  });
});

Hooks.once("ready", () => {
  game.modules.get(MODULE_ID).api = { open: openCompanion, openExternal };
});

Hooks.on("getSceneControlButtons", (controls) => {
  const tools = controls.tokens?.tools;
  if (!tools) return;
  tools[MODULE_ID] = {
    name: MODULE_ID,
    title: "Abrir Vampire Companion",
    icon: "fa-solid fa-mobile-screen-button",
    order: Object.keys(tools).length,
    button: true,
    visible: true,
    onChange: () => openCompanion(),
  };
});

Hooks.on("renderSettings", (_app, html) => {
  const root = html instanceof HTMLElement ? html : html[0];
  if (!root || root.querySelector("[data-everest-companion]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.everestCompanion = "true";
  button.textContent = "Vampire Companion";
  button.addEventListener("click", () => void openCompanion());
  root.append(button);
});
