import { FloatingTabs } from "./floating-tabs.js";

export function registerAdversarySheet() {
  if (game.system.id !== "daggerheart") return;

  const registeredSheets = CONFIG.Actor.sheetClasses.adversary || {};
  const daggerheartSheet = registeredSheets["daggerheart.AdversarySheet"];
  if (!daggerheartSheet) return;

  const DaggerheartAdversarySheet = daggerheartSheet.cls;

  class SleekAdversarySheet extends DaggerheartAdversarySheet {
    collapsedCategories = [];
    openCards = new Set();
    tabs = {};
    floatingTabs = null;

    static DEFAULT_OPTIONS = foundry.utils.mergeObject(
      super.DEFAULT_OPTIONS,
      {
        classes: [
          "daggerheart",
          "sheet",
          "actor",
          "sleek-ui",
          "sleek-adversary",
        ],
        window: { controls: [] },
        position: { width: 750, height: 750 },
        actions: {
          useActorAttack: SleekAdversarySheet._onUseActorAttack,
          toggleCategory: SleekAdversarySheet._onToggleCategory,
        },
      },
      { inplace: false },
    );

    static PARTS = {
      sidebar: {
        template:
          "modules/daggerheart-sleek-ui/templates/adversaries/adversary-sheet-sidebar.hbs",
      },
      mainSheet: {
        template:
          "modules/daggerheart-sleek-ui/templates/adversaries/adversary-sheet-main.hbs",
      },
      limited: {
        template:
          "systems/daggerheart/templates/sheets/actors/character/limited.hbs", // Use system's limited template
      },
    };

    async close(options = {}) {
      if (this.floatingTabs) {
        this.floatingTabs.close();
        this.floatingTabs = null;
      }
      return super.close(options);
    }

    async _prepareContext(options) {
      const context = await super._prepareContext(options);

      context.tabsPosition = game.settings.get(
        "daggerheart-sleek-ui",
        "tabsPosition",
      );

      await this._prepareNotesContext(context, options);

      if (Object.keys(this.tabs).length === 0) {
        this.tabs = {
          features: {
            id: "features",
            label: game.i18n.localize("DAGGERHEART.GENERAL.Tabs.features"),
            icon: "fa-solid fa-list-ul",
            active: true,
          },
          effects: {
            id: "effects",
            label: game.i18n.localize("DAGGERHEART.GENERAL.Tabs.effects"),
            icon: "fa-solid fa-sparkles",
            active: false,
          },
          notes: {
            id: "notes",
            label: game.i18n.localize("DAGGERHEART.GENERAL.Tabs.notes"),
            icon: "fa-solid fa-feather-pointed",
            active: false,
          },
        };
      }

      context.tabs = this.tabs;

      context.currentFear = game.settings.get(
        CONFIG.DH.id,
        CONFIG.DH.SETTINGS.gameSettings.Resources.Fear,
      );

      context.hasExperiences =
        Object.keys(this.actor.system.experiences ?? {}).length > 0;

      if (options.isFirstRender && !this.collapsedCategories) {
        this.collapsedCategories =
          this.actor.getFlag("daggerheart-sleek-ui", "collapsedCategories") ||
          [];
      }
      context.collapsedCategories = this.collapsedCategories || [];

      const part = this.actor.system.attack.damage.parts[0];
      const multiplier = part.value.flatMultiplier ?? 1;
      const dice = part.value.dice ?? "";
      const bonus = part.value.bonus ?? 0;
      context.attackDamage = `${multiplier}${dice}${bonus > 0 ? " + " + bonus : bonus < 0 ? bonus : ""}`;
      context.attackDamageType = [...part.type];
      context.attackRange = this.actor.system.attack.range;
      context.attack = this.actor.system.attack;

      await this._prepareFeaturesData(context);
      await this._prepareEffectsData(context);

      return context;
    }

    async _prepareFeaturesData(context) {
      const currentFear = game.settings.get(
        CONFIG.DH.id,
        CONFIG.DH.SETTINGS.gameSettings.Resources.Fear,
      );

      context.adversaryFeatures = await Promise.all(
        (context.features || []).map(async (item) => {
          let fearCost = 0;
          let usesData = null;

          if (item.system.actions) {
            for (const action of item.system.actions) {
              if (action.cost) {
                for (const cost of action.cost) {
                  if (cost.key === "fear") {
                    fearCost = Math.max(fearCost, cost.value);
                  }
                }
              }
              if (action.uses && action.uses.max && !usesData) {
                const max = parseInt(action.uses.max);
                usesData = {
                  current: action.uses.value,
                  max,
                  remaining: max - action.uses.value,
                  recovery: action.uses.recovery,
                  actionId: action._id,
                };
              }
            }
          }

          const enrichedDescription =
            await foundry.applications.ux.TextEditor.enrichHTML(
              item.system.description,
              { relativeTo: item, rollData: this.actor.getRollData() },
            );

          const tags = [
            {
              label: game.i18n.localize(
                `DAGGERHEART.CONFIG.FeatureForm.${item.system.featureForm}`,
              ),
              tagClass: "tag-blue",
            },
          ];

          return {
            item,
            tags,
            fearCost,
            usesData,
            enrichedDescription,
          };
        }),
      );
    }

    async _prepareEffectsData(context) {
      const getItemTypeName = (type) => {
        const typeMap = {
          feature: "Feature",
          adversary: "Adversary",
        };
        return typeMap[type] || "Unknown";
      };

      const createEffectData = async (effect) => {
        const infoTags = [];
        const resourceTags = [];
        let sourceItem = null;

        if (effect.origin) {
          sourceItem = await fromUuid(effect.origin);
        }
        if (!sourceItem && effect.parent) {
          sourceItem = effect.parent;
        }
        if (sourceItem) {
          const sourceTypeName = getItemTypeName(sourceItem.type);
          infoTags.push({
            label: `${sourceTypeName}: ${sourceItem.name}`,
            uuid: sourceItem.uuid,
            tagClass: "tag-green",
          });
        }

        if (effect.statuses && effect.statuses.size > 0) {
          effect.statuses.forEach((status) => {
            resourceTags.push({
              label: status.charAt(0).toUpperCase() + status.slice(1),
              uuid: "",
              tagClass: "tag-blue",
            });
          });
        }

        const isTemporary =
          effect.isTemporary ||
          effect.duration?.rounds != null ||
          (effect.duration?.seconds != null && effect.duration.seconds > 0) ||
          effect.duration?.turns != null;

        resourceTags.push({
          label: isTemporary ? "Temporary" : "Passive",
          uuid: "",
          tagClass: "tag-blue",
        });

        let description = effect.description;
        if (description && /^[A-Z][A-Z_]+\./.test(description)) {
          description = game.i18n.localize(description);
        }
        const enrichedDescription =
          await foundry.applications.ux.TextEditor.enrichHTML(description, {
            relativeTo: effect,
          });

        return { item: effect, infoTags, resourceTags, enrichedDescription };
      };

      const allEffects = Array.from(this.actor.allApplicableEffects());
      const activeEffects = allEffects.filter((e) => !e.disabled);
      const inactiveEffects = allEffects.filter((e) => e.disabled);

      context.activeEffects = await Promise.all(
        activeEffects.map((effect) => createEffectData(effect)),
      );
      context.inactiveEffects = await Promise.all(
        inactiveEffects.map((effect) => createEffectData(effect)),
      );
    }

    async _prepareNotesContext(context, options) {
      await super._prepareNotesContext(context, options);

      if (context.notes?.value) {
        context.notes.enriched =
          await foundry.applications.ux.TextEditor.enrichHTML(
            context.notes.value,
            {
              relativeTo: this.document,
              rollData: this.actor.getRollData(),
            },
          );
      }
    }

    _onRender(context, options) {
      super._onRender(context, options);

      this.element.id = "sleek-ui-sheet";

      const tabsPosition = game.settings.get(
        "daggerheart-sleek-ui",
        "tabsPosition",
      );

      if (tabsPosition === "floating") {
        if (!this.floatingTabs) {
          this.floatingTabs = new FloatingTabs(this, this.tabs);
          this.floatingTabs.render(true);
        } else {
          this.floatingTabs.tabs = this.tabs;
          this.floatingTabs.render(false, { parts: ["tabs"] });
        }
      } else {
        // Close floating tabs if they exist
        if (this.floatingTabs) {
          this.floatingTabs.close();
          this.floatingTabs = null;
        }
      }

      this._restoreCardStates();
    }

    _restoreCardStates() {
      this.openCards.forEach((uuid) => {
        const header = this.element.querySelector(
          `.card-container.header[data-item-uuid="${uuid}"]`,
        );
        if (header) {
          const cardWrapper = header.closest(".card-wrapper");
          const description = cardWrapper?.querySelector(
            ".card-container.description",
          );
          if (description) {
            description.style.display = "flex";
          }
        }
      });
    }

    _attachPartListeners(partId, htmlElement, options) {
      super._attachPartListeners?.(partId, htmlElement, options);
      this._attachResourceListeners(htmlElement);
      this._attachAdversaryAttackListener(htmlElement);
      this._attachCardListeners(htmlElement);
      this._attachUsesListeners(htmlElement);
      this._attachSimpleResourceListeners(htmlElement);
      this._attachDieResourceListeners(htmlElement);
      this._attachDiceResourceListeners(htmlElement);
      this._attachActionListeners(htmlElement);
      this._attachBasicTabListeners(htmlElement);
    }

    _attachResourceListeners(htmlElement) {
      const resourceHeaders = htmlElement.querySelectorAll(
        '[data-action="modifyResource"]',
      );
      resourceHeaders.forEach((element) => {
        element.addEventListener("click", (event) => {
          this.constructor._onModifyResource.call(this, event, element);
        });
        element.addEventListener("contextmenu", (event) => {
          this.constructor._onModifyResource.call(this, event, element);
        });
      });

      const resourcePips = htmlElement.querySelectorAll(
        '[data-action="toggleResource"]',
      );
      resourcePips.forEach((element) => {
        element.addEventListener("click", (event) => {
          this.constructor._onToggleResource.call(this, event, element);
        });
        element.addEventListener("contextmenu", (event) => {
          event.preventDefault();
          this.constructor._onToggleResource.call(this, event, element);
        });
      });
    }

    _attachAdversaryAttackListener(htmlElement) {
      htmlElement.querySelectorAll(".actor-attack-roll").forEach((button) => {
        button.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();

          const action = this.actor.system.attack;
          const config = action.prepareConfig(event);
          config.effects =
            await game.system.api.data.actions.actionsTypes.base.getEffects(
              this.actor,
              null,
            );
          config.hasRoll = false;
          action.workflow.get("damage").execute(config, null, true);
        });
      });
    }

    _attachCardListeners(htmlElement) {
      const cardNameContainers = htmlElement.querySelectorAll(
        ".card-text, .card-resource",
      );
      cardNameContainers.forEach((nameContainer) => {
        nameContainer.addEventListener("click", (event) => {
          if (
            event.target.closest(
              '.card-controls, [data-action="useItem"], [data-action="useActorAttack"], [data-action="useAction"], .uses-resource, .actor-attack-roll, .simple-resource, .die-resource, .dice-resource',
            )
          )
            return;

          const cardWrapper = nameContainer.closest(".card-wrapper");
          if (!cardWrapper) return;

          const description = cardWrapper.querySelector(
            ".card-container.description",
          );
          const itemUuid =
            nameContainer.closest("[data-item-uuid]")?.dataset.itemUuid;

          if (description && itemUuid) {
            const isCurrentlyHidden =
              description.style.display === "none" ||
              !description.style.display;
            description.style.display = isCurrentlyHidden ? "flex" : "none";
            if (isCurrentlyHidden) {
              this.openCards.add(itemUuid);
            } else {
              this.openCards.delete(itemUuid);
            }
          }
        });
      });
    }

    _attachUsesListeners(htmlElement) {
      const usesResources = htmlElement.querySelectorAll(".uses-resource");
      usesResources.forEach((element) => {
        element.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();

          const itemUuid =
            element.closest("[data-item-uuid]")?.dataset.itemUuid;
          const actionId = element.dataset.actionId;
          if (!itemUuid || !actionId) return;

          const item = await fromUuid(itemUuid);
          if (!item) return;

          const action = item.system.actions?.get(actionId);
          if (!action || !action.uses) return;

          const newValue = Math.max(0, action.uses.value - 1);
          await action.update({ "uses.value": newValue });
        });

        element.addEventListener(
          "contextmenu",
          async (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();

            const itemUuid =
              element.closest("[data-item-uuid]")?.dataset.itemUuid;
            const actionId = element.dataset.actionId;
            if (!itemUuid || !actionId) return;

            const item = await fromUuid(itemUuid);
            if (!item) return;

            const action = item.system.actions?.get(actionId);
            if (!action || !action.uses) return;

            const newValue = Math.min(action.uses.max, action.uses.value + 1);
            await action.update({ "uses.value": newValue });
          },
          true,
        );
      });
    }

    _attachSimpleResourceListeners(htmlElement) {
      htmlElement.querySelectorAll(".simple-resource").forEach((element) => {
        element.addEventListener("click", async (event) => {
          const itemUuid = element.dataset.itemUuid;
          if (!itemUuid) return;
          const item = await fromUuid(itemUuid);
          if (!item) return;
          const maxValue = parseInt(element.dataset.max) || 0;
          const currentValue = item.system.resource.value || 0;
          await item.update({
            "system.resource.value": Math.min(maxValue, currentValue + 1),
          });
        });

        element.addEventListener(
          "contextmenu",
          async (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            const itemUuid = element.dataset.itemUuid;
            if (!itemUuid) return;
            const item = await fromUuid(itemUuid);
            if (!item) return;
            const currentValue = item.system.resource.value || 0;
            await item.update({
              "system.resource.value": Math.max(0, currentValue - 1),
            });
          },
          true,
        );
      });
    }

    _attachDieResourceListeners(htmlElement) {
      htmlElement.querySelectorAll(".die-resource").forEach((element) => {
        element.addEventListener("click", async (event) => {
          const itemUuid = element.dataset.itemUuid;
          if (!itemUuid) return;
          const item = await fromUuid(itemUuid);
          if (!item) return;
          const dieFaces =
            parseInt(element.dataset.dieFaces.replace("d", "")) || 6;
          const currentValue = item.system.resource.value || 0;
          await item.update({
            "system.resource.value": (currentValue + 1) % (dieFaces + 1),
          });
        });

        element.addEventListener(
          "contextmenu",
          async (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            const itemUuid = element.dataset.itemUuid;
            if (!itemUuid) return;
            const item = await fromUuid(itemUuid);
            if (!item) return;
            const currentValue = item.system.resource.value || 0;
            await item.update({
              "system.resource.value": Math.max(0, currentValue - 1),
            });
          },
          true,
        );
      });
    }

    _attachDiceResourceListeners(htmlElement) {
      htmlElement.querySelectorAll(".dice-resource").forEach((resource) => {
        resource.querySelectorAll(".dice-value").forEach((diceValue) => {
          diceValue.addEventListener("click", async (event) => {
            event.stopPropagation();
            const itemUuid =
              diceValue.closest("[data-item-uuid]")?.dataset.itemUuid;
            const item = await fromUuid(itemUuid);
            const diceIndex = diceValue.dataset.dice;
            const currentState = item.system.resource.diceStates[diceIndex];
            if (!currentState) return;
            await item.update({
              [`system.resource.diceStates.${diceIndex}.used`]:
                !currentState.used,
            });
          });
        });
      });
    }

    _attachActionListeners(htmlElement) {
      htmlElement
        .querySelectorAll('[data-action="useAction"]')
        .forEach((button) => {
          button.addEventListener("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const itemUuid = button.dataset.itemUuid;
            const actionId = button.dataset.actionId;
            if (!itemUuid || !actionId) return;

            const item = await fromUuid(itemUuid);
            if (!item) return;

            const action = item.system.actions?.get(actionId);
            if (!action) return;

            await action.use(event);
          });
        });
    }

    _attachBasicTabListeners(htmlElement) {
      htmlElement.querySelectorAll(".basic-tabs .tab-button").forEach((btn) => {
        btn.addEventListener("click", async (event) => {
          event.preventDefault();
          const tabId = btn.dataset.tab;

          Object.keys(this.tabs).forEach((key) => {
            this.tabs[key].active = key === tabId;
          });

          await this.render(true);
        });
      });
    }

    static async _onModifyResource(event, target) {
      event.preventDefault();
      const resource = target.dataset.resource;
      let amount = parseInt(target.dataset.amount);

      if (event.type === "contextmenu") {
        amount = -amount;
      }

      const currentValue = foundry.utils.getProperty(this.actor, resource);
      const maxPath = resource.replace(".value", ".max");
      const maxValue = foundry.utils.getProperty(this.actor, maxPath);
      const newValue = Math.max(0, Math.min(maxValue, currentValue + amount));

      await this.actor.update({ [resource]: newValue });
    }

    static async _onToggleResource(event, target) {
      const resource = target.dataset.resource;
      const clickedValue = parseInt(target.dataset.value);
      const currentValue = foundry.utils.getProperty(this.actor, resource);
      const newValue =
        clickedValue === currentValue ? currentValue - 1 : clickedValue;
      await this.actor.update({ [resource]: Math.max(0, newValue) });
    }

    static async _onUseActorAttack(event, target) {
      const action = this.actor.system.attack;
      await action.use(event);
    }

    static async _onToggleCategory(event, target) {
      const wrapper = target.closest(".category-wrapper");
      if (!wrapper) return;

      wrapper.classList.toggle("collapsed");

      const categoryId = wrapper.dataset.categoryId;
      if (!categoryId) return;

      const isCollapsed = wrapper.classList.contains("collapsed");

      if (isCollapsed) {
        if (!this.collapsedCategories.includes(categoryId)) {
          this.collapsedCategories.push(categoryId);
        }
      } else {
        const index = this.collapsedCategories.indexOf(categoryId);
        if (index > -1) {
          this.collapsedCategories.splice(index, 1);
        }
      }
      this.actor.setFlag("daggerheart-sleek-ui", "collapsedCategories", [
        ...this.collapsedCategories,
      ]);
    }

    async render(options = {}, _options = {}) {
      if (this.actor.limited && !this.actor.isOwner) {
        const systemSheet =
          CONFIG.Actor.sheetClasses.adversary["daggerheart.AdversarySheet"];
        if (systemSheet) {
          const defaultSheet = new systemSheet.cls({ document: this.actor });
          return defaultSheet.render(true, _options);
        }
      }
      return super.render(options, _options);
    }
  }

  DocumentSheetConfig.registerSheet(Actor, "daggerheart", SleekAdversarySheet, {
    types: ["adversary"],
    makeDefault: true,
    label: "DH Sleek UI",
  });

  Hooks.on("updateSetting", (setting) => {
    if (
      setting.key !==
      `${CONFIG.DH.id}.${CONFIG.DH.SETTINGS.gameSettings.Resources.Fear}`
    )
      return;

    canvas.tokens.placeables
      .filter((t) => t.actor?.type === "adversary")
      .forEach((t) => {
        const sheet = t.actor?.sheet;
        if (sheet instanceof SleekAdversarySheet && sheet.rendered) {
          sheet.render();
        }
      });
  });
}
