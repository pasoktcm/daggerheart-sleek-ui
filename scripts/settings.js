const MODULE = "daggerheart-sleek-ui";

export function registerSettings() {

  // Theme Foundryborne
  game.settings.register(MODULE, "theme", {
    name: `${MODULE}.settings.theme.name`,
    hint: `${MODULE}.settings.theme.hint`,
    requiresReload: true,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  // Theme Chat Cards
  game.settings.register(MODULE, "themeChat", {
    name: `${MODULE}.settings.themeChat.name`,
    hint: `${MODULE}.settings.themeChat.hint`,
    requiresReload: true,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  // Minisheets
  game.settings.register(MODULE, "enableMinisheet", {
    name: `${MODULE}.settings.enableMinisheet.name`,
    hint: `${MODULE}.settings.enableMinisheet.hint`,
    requiresReload: true,
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
  });

  // Minisheet Style

  //Minisheet Transform
  game.settings.register(MODULE, "minisheetScale", {
    name: `${MODULE}.settings.minisheetScale.name`,
    hint: `${MODULE}.settings.minisheetScale.hint`,
    scope: "client",
    config: true,
    type: Number,
    range: {
      min: 0.8,
      max: 1.2,
      step: 0.05,
    },
    default: 1,
    onChange: (value) => applyMinisheetScale(value),
  });

  game.settings.register(MODULE, "minisheetOffset", {
    name: `${MODULE}.settings.minisheetOffset.name`,
    hint: `${MODULE}.settings.minisheetOffset.hint`,
    scope: "client",
    config: true,
    type: Number,
    range: { min: -500, max: 500, step: 1 },
    default: 0,
    onChange: () => applyMinisheetOffset(),
  });

  // Tabs Position
  game.settings.register(MODULE, "tabsPosition", {
    name: `${MODULE}.settings.tabsPosition.name`,
    scope: "client",
    config: true,
    type: String,
    choices: {
      floating: `${MODULE}.settings.tabsPosition.choices.floating`,
      basic: `${MODULE}.settings.tabsPosition.choices.basic`,
    },
    default: "floating",
    onChange: () => {
      Object.values(ui.windows).forEach((app) => {
        if (app.render) app.render();
      });
    },
  });

  // Quick Access
  game.settings.register(MODULE, "quickAccess", {
    name: `${MODULE}.settings.quickAccess.name`,
    hint: `${MODULE}.settings.quickAccess.hint`,
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
  });

  // Tooltips
  game.settings.register(MODULE, "showTooltip", {
    name: `${MODULE}.settings.showTooltip.name`,
    hint: `${MODULE}.settings.showTooltip.hint`,
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
  });

  // Currency Labels
  game.settings.register(MODULE, "currencyLabel", {
    name: `${MODULE}.settings.currencyLabel.name`,
    hint: `${MODULE}.settings.currencyLabel.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  // Beastform Portrait
  game.settings.register(MODULE, "beastformPortrait", {
    name: `${MODULE}.settings.beastformPortrait.name`,
    hint: `${MODULE}.settings.beastformPortrait.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

}

export function applyMinisheetScale(value) {
  const scale = value ?? game.settings.get("daggerheart-sleek-ui", "minisheetScale");
  const offset = game.settings.get("daggerheart-sleek-ui", "minisheetOffset");
  const wrapper = document.querySelector("#sleek-ui-sheet .minisheet-transform-wrapper");
  if (wrapper) {
    wrapper.style.transform = `translateX(${offset}px) scale(${scale})`;
    wrapper.style.transformOrigin = "bottom center";
  }
}

export function applyMinisheetOffset() {
  const scale = game.settings.get("daggerheart-sleek-ui", "minisheetScale");
  const offset = game.settings.get("daggerheart-sleek-ui", "minisheetOffset");
  const wrapper = document.querySelector("#sleek-ui-sheet .minisheet-transform-wrapper");
  if (wrapper) {
    wrapper.style.transform = `translateX(${offset}px) scale(${scale})`;
    wrapper.style.transformOrigin = "bottom center";
  }
}

export function applyTheme() {
  if (!game.settings.get("daggerheart-sleek-ui", "theme")) return;

  const addStyle = (href) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = href;
    document.head.appendChild(link);
  };

  addStyle("modules/daggerheart-sleek-ui/styles/theme.css");
}

export function applyThemeChat() {
  if (!game.settings.get("daggerheart-sleek-ui", "themeChat")) return;

  const addStyle = (href) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = href;
    document.head.appendChild(link);
  };

  addStyle("modules/daggerheart-sleek-ui/styles/theme-chat.css");
}
