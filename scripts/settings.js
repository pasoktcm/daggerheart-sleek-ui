export function registerSettings() {
  // CLIENT SCOPE //

  // Tabs Position
  game.settings.register("daggerheart-sleek-ui", "tabsPosition", {
    name: "Tabs Position",
    scope: "client",
    config: true,
    type: String,
    choices: {
      floating: "Floating",
      basic: "Basic",
    },
    default: "floating",
    onChange: () => {
      Object.values(ui.windows).forEach((app) => {
        if (app.render) app.render();
      });
    },
  });

  // Quick Access
  game.settings.register("daggerheart-sleek-ui", "quickAccess", {
    name: "Enable Quick Access",
    hint: "Switch the default equipment and loadout sidebar sections with a universal Quick Access section",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
  });

  // Minisheets
  game.settings.register("daggerheart-sleek-ui", "enableMinisheet", {
    name: "Enable Mini Sheets",
    hint: "Enables the mini sheet displayed at the bottom of the screen while a token is selected",
    requiresReload: true,
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
  });

  //Minisheet Transform
  game.settings.register("daggerheart-sleek-ui", "minisheetScale", {
    name: "Minisheet Scale",
    hint: "Adjusts the scale of the mini sheets to better accomodate smaller or larger screens (default: 1)",
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

  // Sidebar Expand
  game.settings.register("daggerheart-sleek-ui", "sidebarExpand", {
    name: "Sidebar Expand in Place",
    hint: "Clicking on a sidebar card expands it in place instead of navigating to its tab",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  game.settings.register("daggerheart-sleek-ui", "minisheetOffset", {
    name: "Minisheet Horizontal Offset",
    hint: "Adjusts the horizontal position of the mini sheets, nudging it from the center by the value in pixels (default: 0)",
    scope: "client",
    config: true,
    type: Number,
    range: { min: -500, max: 500, step: 1 },
    default: 0,
    onChange: () => applyMinisheetOffset(),
  });

  // Tooltips
  game.settings.register("daggerheart-sleek-ui", "showTooltip", {
    name: "Show Card Tooltips",
    hint: "Shows tooltips for cards when hovering the icon",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
  });

  // WORLD SCOPE //

  // Beastform Portrait
  game.settings.register("daggerheart-sleek-ui", "beastformPortrait", {
    name: "Use Beastform Portrait",
    hint: "When in beastform, change the character's portrait to the form's Subject Texture",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  // Currency Labels
  game.settings.register("daggerheart-sleek-ui", "currencyLabel", {
    name: "Show Currency Labels",
    hint: "Shows the labels for each currency on top of their values",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  // Party Sheet Metagaming
  game.settings.register("daggerheart-sleek-ui", "partySheetMetagaming", {
    name: "Restrict Party Sheet Metagaming",
    hint: "When enabled, only players with Observer (or higher) ownership of a character will see their detailed resources and stats in the party sheet and party mini sheet",
    requiresReload: true,
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  // Theme Foundryborne
  game.settings.register("daggerheart-sleek-ui", "theme", {
    name: "Theme Foundryborne",
    hint: "Enables the styling of Foundryborne's application windows to match Sleek UI's styling",
    requiresReload: true,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  // Theme Chat Cards
  game.settings.register("daggerheart-sleek-ui", "themeChat", {
    name: "Theme Chat Cards",
    hint: "Enables the styling of chat cards to match Sleek UI's styling",
    requiresReload: true,
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
