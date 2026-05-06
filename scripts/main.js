import { preloadHandlebarsTemplates, registerHelpers } from "./helpers.js";
import { registerSettings, applyMinisheetScale, applyMinisheetOffset, applyTheme, applyThemeChat } from "./settings.js";
import { registerMinisheetKeybinding } from "./sheets/minisheets/utils-minisheet.js";

import { registerCharacterSheet } from "./sheets/character-sheet.js";
import { registerCompanionSheet } from "./sheets/companion-sheet.js";
import { registerPartySheet } from "./sheets/party-sheet.js";

import { registerAdversarySheet } from "./sheets/adversary-sheet.js";
import { registerEnvironmentSheet } from "./sheets/environment-sheet.js";

import { registerCharacterMiniSheet } from "./sheets/minisheets/minisheet-character.js";
import { registerCompanionMiniSheet } from "./sheets/minisheets/minisheet-companion.js";
import { registerPartyMiniSheet } from "./sheets/minisheets/minisheet-party.js";
import { registerAdversaryMiniSheet } from "./sheets/minisheets/minisheet-adversary.js";

Hooks.once("init", () => {
  preloadHandlebarsTemplates();
  registerHelpers();
  registerSettings();
  registerMinisheetKeybinding();
});

Hooks.on("ready", () => {
  applyMinisheetScale();
  applyMinisheetOffset();
  applyTheme();
  applyThemeChat();
});

Hooks.once("ready", () => {
  registerCharacterSheet();
  registerCompanionSheet();
  registerPartySheet();

  registerAdversarySheet();
  registerEnvironmentSheet();

  registerCharacterMiniSheet();
  registerCompanionMiniSheet();
  registerPartyMiniSheet();
  registerAdversaryMiniSheet();
});
