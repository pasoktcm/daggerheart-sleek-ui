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

export async function toggleResourceManagement(event, button, actor) {
  event.stopPropagation();

  if (document.body.querySelector(".locked-tooltip .resource-management-container")) {
    game.tooltip.dismissLockedTooltips();
    return;
  }

  const resources = Object.values(CONFIG.DH.RESOURCE.character.all).reduce((acc, resource) => {
    if (CONFIG.DH.RESOURCE.character.base[resource.id]) return acc;

    const resourceData = actor.system.resources[resource.id];
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

  const html = document.createElement("div");
  html.innerHTML = await foundry.applications.handlebars.renderTemplate(
    "systems/daggerheart/templates/ui/tooltip/resourceManagement.hbs",
    { resources },
  );

  const target = button.closest(".resource-section");
  const resourceManager = target?.querySelector(".resource-manager");

  game.tooltip.dismissLockedTooltips();
  game.tooltip.activate(target, {
    html,
    locked: true,
    cssClass: "bordered-tooltip dh-style",
    direction: "DOWN",
    noOffset: true,
  });

  resourceManager?.classList.add("inverted");

  Hooks.once(CONFIG.DH.HOOKS.hooksConfig.lockedTooltipDismissed, () => {
    resourceManager?.classList.remove("inverted");
  });

  for (const element of html.querySelectorAll(".resource-value")) {
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
  }
}

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
