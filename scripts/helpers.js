/* ====================
   TEMPLATES
   ==================== */

export async function preloadHandlebarsTemplates() {
  const templatePaths = [
    // Character templates
    "modules/daggerheart-sleek-ui/templates/sheets/characters/sheet-main.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/characters/sheet-sidebar.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/characters/main/header.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/characters/main/tabs.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/characters/main/favorites.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/characters/tabs/features.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/characters/tabs/loadout.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/characters/tabs/inventory.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/characters/tabs/effects.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/characters/tabs/biography.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/characters/minisheet.hbs",
    // Companion templates
    "modules/daggerheart-sleek-ui/templates/sheets/companions/companion-sheet-main.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/companions/main/companion-header.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/companions/main/companion-tabs.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/companions/tabs/companion-details.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/companions/tabs/companion-effects.hbs",
    "modules/daggerheart-sleek-ui/templates/components/card-companion-partner.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/companions/companion-minisheet.hbs",
    // Party templates
    "modules/daggerheart-sleek-ui/templates/sheets/party/party-sheet-main.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/party/main/party-header.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/party/main/party-tabs.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/party/tabs/party-members.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/party/tabs/party-inventory.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/party/tabs/party-notes.hbs",
    "modules/daggerheart-sleek-ui/templates/components/card-party-character.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/party/party-minisheet.hbs",
    // Adversary templates
    "modules/daggerheart-sleek-ui/templates/sheets/adversaries/adversary-sheet-main.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/adversaries/adversary-sheet-sidebar.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/adversaries/main/adversary-header.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/adversaries/main/adversary-tabs.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/adversaries/tabs/adversary-features.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/adversaries/tabs/adversary-effects.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/adversaries/tabs/adversary-notes.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/adversaries/adversary-minisheet.hbs",
    // Environment templates
    "modules/daggerheart-sleek-ui/templates/sheets/environments/environment-sheet-main.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/environments/main/environment-header.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/environments/main/environment-tabs.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/environments/tabs/environment-features.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/environments/tabs/environment-adversaries.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/environments/tabs/environment-notes.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/environments/environment-minisheet.hbs",
    "modules/daggerheart-sleek-ui/templates/sheets/environments/environment-minisheet-scene.hbs",
    "modules/daggerheart-sleek-ui/templates/components/card-environment-adversaries.hbs",
    // Shared components
    "modules/daggerheart-sleek-ui/templates/components/tabs-floating.hbs",
    "modules/daggerheart-sleek-ui/templates/components/tabs-basic.hbs",
    "modules/daggerheart-sleek-ui/templates/components/currency.hbs",
    "modules/daggerheart-sleek-ui/templates/components/card-features.hbs",
    "modules/daggerheart-sleek-ui/templates/components/card-domains.hbs",
    "modules/daggerheart-sleek-ui/templates/components/card-weapon.hbs",
    "modules/daggerheart-sleek-ui/templates/components/card-armor.hbs",
    "modules/daggerheart-sleek-ui/templates/components/card-item.hbs",
    "modules/daggerheart-sleek-ui/templates/components/card-effects.hbs",
    "modules/daggerheart-sleek-ui/templates/components/card-companion-effects.hbs",
    "modules/daggerheart-sleek-ui/templates/components/card-actor-attack.hbs",
    "modules/daggerheart-sleek-ui/templates/components/card-npc-features.hbs",
    "modules/daggerheart-sleek-ui/templates/components/compact-card-weapon.hbs",
    "modules/daggerheart-sleek-ui/templates/components/compact-card-armor.hbs",
    "modules/daggerheart-sleek-ui/templates/components/compact-card-domains.hbs",
    "modules/daggerheart-sleek-ui/templates/components/compact-card-features.hbs",
    "modules/daggerheart-sleek-ui/templates/components/compact-card-item.hbs",
    "modules/daggerheart-sleek-ui/templates/components/divider.hbs",
    "modules/daggerheart-sleek-ui/templates/components/res-dice.hbs",
    "modules/daggerheart-sleek-ui/templates/components/res-die.hbs",
    "modules/daggerheart-sleek-ui/templates/components/res-hope.hbs",
    "modules/daggerheart-sleek-ui/templates/components/res-recall.hbs",
    "modules/daggerheart-sleek-ui/templates/components/res-simple.hbs",
    "modules/daggerheart-sleek-ui/templates/components/res-uses.hbs",
    "modules/daggerheart-sleek-ui/templates/components/res-quantity.hbs",
    "modules/daggerheart-sleek-ui/templates/components/res-fear.hbs",
  ];
  return loadTemplates(templatePaths);
}

/* ====================
   RESOURCE MANAGEMENT
   ==================== */

function _getResourceTooltipPosition(target) {
  const pad = game.tooltip.constructor.TOOLTIP_MARGIN_PX ?? 5;
  const anchor = target.getBoundingClientRect();

  return {
    top: `${anchor.bottom + pad}px`,
    left: `${anchor.left}px`,
    bottom: "",
    right: "",
  };
}

export async function toggleResourceManagement(event, button, actor) {
  event.preventDefault();
  event.stopPropagation();

  if (document.body.querySelector(".locked-tooltip .resource-management-container")) {
    game.tooltip.dismissLockedTooltips();
    return;
  }

  const resources = Object.values(CONFIG.DH.RESOURCE.character.all).reduce((acc, resource) => {
    if (CONFIG.DH.RESOURCE.character.base[resource.id]) return acc;

    const resourceData = actor.system.resources[resource.id];
    if (!resourceData) return acc;

    acc[resource.id] = {
      id: resource.id,
      label: game.i18n.localize(resource.label),
      value: resourceData.value,
      max: resourceData.max,
      fullIcon: resource.images?.full ?? { value: "fa-solid fa-circle", isIcon: true },
      emptyIcon: resource.images?.empty ?? { value: "fa-regular fa-circle", isIcon: true },
    };

    return acc;
  }, {});

  if (!Object.keys(resources).length) return;

  const htmlContent = await foundry.applications.handlebars.renderTemplate(
    "systems/daggerheart/templates/ui/tooltip/resourceManagement.hbs",
    { resources },
  );

  const target = button.closest(".resource-section");
  if (!target) return;

  const resourceManager = target.querySelector(".resource-manager");
  const position = _getResourceTooltipPosition(target);

  game.tooltip.deactivate();
  game.tooltip.dismissLockedTooltips();

  const lockedTooltip = game.tooltip.createLockedTooltip(position, htmlContent, {
    cssClass: "bordered-tooltip dh-style",
  });

  resourceManager?.classList.add("inverted");

  Hooks.once(CONFIG.DH.HOOKS.hooksConfig.lockedTooltipDismissed, () => {
    resourceManager?.classList.remove("inverted");
  });

  lockedTooltip.querySelectorAll(".resource-value").forEach((element) => {
    element.addEventListener("click", async (clickEvent) => {
      const pip = clickEvent.target.closest(".resource-value");
      if (!pip) return;

      const { resource, value: textValue } = pip.dataset;
      const inputValue = Number.parseInt(textValue);
      const decreasing = inputValue <= actor.system.resources[resource].value;
      const value = decreasing ? inputValue - 1 : inputValue;

      await actor.update({ [`system.resources.${resource}.value`]: value }, { render: false });

      const section = pip.closest(".resource-section");
      for (const pipEl of section.querySelectorAll(".resource-value")) {
        const showFull = Number.parseInt(pipEl.dataset.value) <= value;
        pipEl.querySelector(".full")?.classList.toggle("hidden", !showFull);
        pipEl.querySelector(".empty")?.classList.toggle("hidden", showFull);
      }
    });
  });
}

/* ====================
   ARMOR MANAGEMENT
   ==================== */

function _armorSourceOrder(origin) {
  switch (origin?.type) {
    case "class":
    case "subclass":
    case "ancestry":
    case "community":
    case "feature":
    case "domainCard":
      return 2;
    case "loot":
    case "consumable":
      return 3;
    case "character":
      return 4;
    case "weapon":
      return 5;
    case "armor":
      return 6;
    default:
      return 1;
  }
}

function _getArmorSources(actor) {
  const rawArmorSources = Array.from(actor.allApplicableEffects()).filter((x) => x.system.armorData);
  if (actor.system.armor) rawArmorSources.push(actor.system.armor);

  const data = rawArmorSources.map((doc) => {
    const origin = doc.origin ? foundry.utils.fromUuidSync(doc.origin) : doc;
    const useParentName = doc.parent && !(doc.parent instanceof Actor) && doc.parent.type !== "armor";
    const name = doc.origin || !useParentName ? doc.name : doc.parent.name;

    return {
      origin,
      name,
      document: doc,
      data: doc.system.armor ?? doc.system.armorData,
      disabled: !!doc.disabled || !!doc.isSuppressed,
    };
  });

  return data.sort((a, b) => _armorSourceOrder(a.origin) - _armorSourceOrder(b.origin));
}

function _getArmorTooltipPosition(target, direction) {
  const pad = game.tooltip.constructor.TOOLTIP_MARGIN_PX ?? 5;
  const anchor = target.getBoundingClientRect();
  const right = `${window.innerWidth - anchor.right}px`;

  if (direction === "UP") {
    return {
      top: "",
      left: "",
      bottom: `${window.innerHeight - anchor.top + pad}px`,
      right,
    };
  }

  return {
    top: `${anchor.bottom + pad}px`,
    left: "",
    bottom: "",
    right,
  };
}

function _setArmorSlotIcon(icon, filled) {
  if (filled) {
    icon.classList.remove("fa-regular", "fa-shield-halved");
    icon.classList.add("fa-solid", "fa-shield");
  } else {
    icon.classList.remove("fa-solid", "fa-shield-halved");
    icon.classList.add("fa-regular", "fa-shield");
  }
}

function _getArmorSourceCurrent(document) {
  if (document.type === "armor") {
    return document.system.armor.current;
  }
  if (document.system.armorData) {
    return document.system.armorData.current;
  }
  return 0;
}

async function _syncArmorSlotIcons(container) {
  if (!container) return;

  const slot = container.querySelector(".armor .slot");
  if (!slot?.dataset.uuid) return;

  const document = await foundry.utils.fromUuid(slot.dataset.uuid);
  if (!document) return;

  const current = _getArmorSourceCurrent(document);

  for (const icon of container.querySelectorAll(".armor .slot i")) {
    const index = Number.parseInt(icon.dataset.index);
    _setArmorSlotIcon(icon, index < current);
  }
}

export async function toggleArmorManagement(event, button, actor) {
  event.preventDefault();
  event.stopPropagation();

  if (document.body.querySelector(".locked-tooltip .armor-management-container")) {
    game.tooltip.dismissLockedTooltips();
    return;
  }

  const target = button.closest(".resource-container");
  if (!target) return;

  const armorSources = _getArmorSources(actor)
    .filter((s) => !s.disabled)
    .toReversed()
    .map(({ name, document, data }) => ({
      ...data,
      uuid: document.uuid,
      name,
    }));

  if (!armorSources.length) return;

  const isMinisheet = !!target.closest(".minisheet");
  const direction = isMinisheet ? "UP" : "DOWN";
  const useResourcePips = game.settings.get(CONFIG.DH.id, CONFIG.DH.SETTINGS.gameSettings.appearance).useResourcePips;
  const htmlContent = await foundry.applications.handlebars.renderTemplate(
    "systems/daggerheart/templates/ui/tooltip/armorManagement.hbs",
    { sources: armorSources, useResourcePips },
  );

  const CharacterSheet = CONFIG.Actor.sheetClasses.character["daggerheart.CharacterSheet"]?.cls;
  const position = _getArmorTooltipPosition(target, direction);

  game.tooltip.deactivate();
  game.tooltip.dismissLockedTooltips();

  const lockedTooltip = game.tooltip.createLockedTooltip(position, htmlContent, {
    cssClass: "bordered-tooltip dh-style",
  });

  for (const slotBar of lockedTooltip.querySelectorAll(".slot-bar.armor")) {
    await _syncArmorSlotIcons(slotBar);
  }

  if (CharacterSheet?.armorSourcePipUpdate) {
    lockedTooltip.querySelectorAll(".armor .slot").forEach((element) => {
      element.addEventListener("click", async (event) => {
        await CharacterSheet.armorSourcePipUpdate(event);
        await _syncArmorSlotIcons(element.closest(".slot-bar"));
      });
    });
  }
}

/* ====================
   TOOLTIPS
   ==================== */

/** Dismiss the active hover tooltip when the pointer leaves tooltip triggers. */
export function dismissHoverTooltip(event) {
  const hoveredElement = document.elementFromPoint(event.clientX, event.clientY);
  const isOverTooltipTrigger = hoveredElement?.closest("[data-tooltip], [data-tooltip-text]");
  if (!isOverTooltipTrigger && game.tooltip?.active) {
    game.tooltip.deactivate();
  }
}

/* ====================
   DOMAIN CARDS
   ==================== */

/**
 * Recall a domain card from vault, showing the cost dialog with a proper title.
 * @param {Item} item
 * @param {Event} event
 */
export async function recallDomainCardFromVault(item, event) {
  const sys = item?.system;
  if (!sys?.toggleVault) return;

  if (sys.recallCost === 0) {
    return sys.toggleVault(event, false);
  }

  const cls = game.system.api.models.actions.actionsTypes.effect;
  const action = new cls(
    {
      ...cls.getSourceConfig(sys),
      type: "effect",
      name: "DAGGERHEART.APPLICATIONS.ContextMenu.recall",
      chatDisplay: false,
      cost: [{ key: "stress", value: sys.recallCost }],
    },
    { parent: sys },
  );

  const config = await action.use(event);
  if (config) {
    await sys.toggleVault(event, false);
  }
}

/* ====================
   BEASTFORM
   ==================== */

/** @param {Actor} actor */
export function isBeastformActive(actor) {
  return !!actor.effects?.find((x) => !x.disabled && x.type === "beastform");
}

/** @param {Actor} actor @returns {string|null} */
export function getBeastformPortrait(actor) {
  if (!game.settings.get("daggerheart-sleek-ui", "beastformPortrait")) return null;
  if (!isBeastformActive(actor)) return null;
  return actor.prototypeToken?.ring?.subject?.texture || null;
}

/* ====================
   UNARMED ATTACK
   ==================== */

/** @param {Actor} actor @returns {boolean} */
export function resolveUsesUnarmed(actor) {
  const sys = actor.system;
  if (typeof sys.usesUnarmed === "boolean") return sys.usesUnarmed;
  return !!sys.usedUnarmed;
}

/** @param {Actor} actor @returns {object|null} */
export function resolveUnarmedAttack(actor) {
  const sys = actor.system;
  if (typeof sys.usesUnarmed === "boolean") {
    return sys.usesUnarmed ? sys.attack : null;
  }
  return sys.usedUnarmed ?? null;
}

/* ====================
   WEAPON DAMAGE
   ==================== */

/**
 * Build display HTML for a weapon/unarmed attack damage formula.
 * Supports current `damage.main` and legacy `damage.parts` schemas.
 */
export function formatWeaponDamageDisplay(attack, { rollData = {} } = {}) {
  if (!attack?.damage) return "";

  const formatTypeIcons = (typeSet) => {
    if (!typeSet) return "";
    const types = typeSet instanceof Set ? [...typeSet] : [...typeSet];
    if (!types.length) return "";
    return types
      .map((t) => {
        const icon = CONFIG.DH?.GENERAL?.damageTypes?.[t]?.icon;
        if (icon) return `<i class="fa-solid ${icon}"></i>`;
        return t === "magical" ? '<i class="fa-solid fa-wand-sparkles"></i>' : '<i class="fa-solid fa-hand-fist"></i>';
      })
      .join(" ");
  };

  const appendIcons = (formula, part) => {
    const typeIcons = formatTypeIcons(part?.type);
    return typeIcons ? `${formula}&nbsp;&nbsp;${typeIcons}` : formula;
  };

  const resolveFormula = (value) => {
    if (!value) return "";
    if (typeof value.getFormula === "function") {
      return Roll.replaceFormulaData(value.getFormula(), rollData);
    }
    if (value.custom?.enabled) {
      const formula = value.custom.formula ?? game.i18n.localize("DAGGERHEART.GENERAL.custom");
      return formula.includes("@") ? Roll.replaceFormulaData(formula, rollData) : formula;
    }
    return "";
  };

  const mainPart = attack.damage.main;
  if (mainPart) {
    const formula =
      typeof attack.getDamageFormula === "function" ? attack.getDamageFormula() : resolveFormula(mainPart.value);
    if (formula) return appendIcons(formula, mainPart);
  }

  const damageParts = attack.damage.parts;
  if (damageParts && !foundry.utils.isEmpty(damageParts)) {
    return Object.values(damageParts)
      .map((part) => appendIcons(resolveFormula(part.value), part))
      .filter(Boolean)
      .join(", ");
  }

  return "";
}

/* ====================
   INVENTORY
   ==================== */

/** Mirror DHBaseActorSheet inventory quantity listeners. */
export function attachQuantityListeners(root) {
  root.querySelectorAll(".inventory-item-quantity").forEach((input) => {
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("change", async (event) => {
      const target = event.currentTarget.closest("[data-item-uuid]");
      if (!target) return;
      const item = await fromUuid(target.dataset.itemUuid);
      await item?.update({ "system.quantity": event.currentTarget.value });
    });
  });
}

/* ====================
   HANDLEBARS
   ==================== */

export function registerHelpers() {
  Handlebars.registerHelper("contains", function (array, value) {
    return Array.isArray(array) && array.includes(value);
  });

  Handlebars.registerHelper("eq", function (a, b) {
    return a === b;
  });

  Handlebars.registerHelper("add", function (a, b) {
    return Number(a) + Number(b);
  });

  Handlebars.registerHelper("subtract", function (a, b) {
    return Number(a) - Number(b);
  });
}
