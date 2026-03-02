import { FloatingTabs } from "./floating-tabs.js";

export function registerCompanionSheet() {
  if (game.system.id !== "daggerheart") return;

  const registeredSheets = CONFIG.Actor.sheetClasses.companion || {};
  const daggerheartSheet = registeredSheets["daggerheart.DhCompanionSheet"];
  if (!daggerheartSheet) return;

  const DaggerheartCompanionSheet = daggerheartSheet.cls;

  class SleekCompanionSheet extends DaggerheartCompanionSheet {
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
          "sleek-companion",
        ],
        window: { controls: [], resizable: true },
        position: { width: 370, height: 700 },
        actions: {
          useActorAttack: SleekCompanionSheet._onUseActorAttack,
          toggleCategory: SleekCompanionSheet._onToggleCategory,
        },
      },
      { inplace: false },
    );

    static PARTS = {
      mainSheet: {
        template:
          "modules/daggerheart-sleek-ui/templates/companions/companion-sheet-main.hbs",
      },
      limited: {
        template:
          "systems/daggerheart/templates/sheets/actors/character/limited.hbs", // Use system's limited template
      },
    };

    async _prepareContext(options) {
      const context = await super._prepareContext(options);

      // Tabs
      if (Object.keys(this.tabs).length === 0) {
        this.tabs = {
          details: {
            id: "details",
            label: game.i18n.localize("DAGGERHEART.GENERAL.Tabs.details"),
            icon: "fa-solid fa-list-ul",
            active: true,
          },
          effects: {
            id: "effects",
            label: game.i18n.localize("DAGGERHEART.GENERAL.Tabs.effects"),
            icon: "fa-solid fa-sparkles",
            active: false,
          },
        };
      }
      context.tabs = this.tabs;
      context.tabsPosition = game.settings.get(
        "daggerheart-sleek-ui",
        "tabsPosition",
      );

      // Collapsed categories
      if (options.isFirstRender && !this.collapsedCategories) {
        this.collapsedCategories =
          this.actor.getFlag("daggerheart-sleek-ui", "collapsedCategories") ||
          [];
      }
      context.collapsedCategories = this.collapsedCategories || [];

      // Partner info
      if (
        this.actor.system.partner &&
        typeof this.actor.system.partner === "string"
      ) {
        context.partner = await fromUuid(this.actor.system.partner);
      }

      // Attack data
      const part = this.actor.system.attack.damage.parts[0];
      const proficiency = this.actor.system.proficiency ?? 1;
      const dice = part.value.dice ?? "";
      const bonus = part.value.bonus ?? 0;
      context.attackDamage = `${proficiency}${dice}${bonus > 0 ? " + " + bonus : bonus < 0 ? bonus : ""}`;
      context.attackDamageType = [...part.type];
      context.attack = this.actor.system.attack;

      // Check if has experiences
      context.hasExperiences =
        Object.keys(this.actor.system.experiences ?? {}).length > 0;

      await this._prepareEffectsData(context);

      return context;
    }

    async _prepareEffectsData(context) {
      const getItemTypeName = (type) => {
        const typeMap = {
          feature: "Feature",
          companion: "Companion",
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
      this._attachCompanionAttackListener(htmlElement);
      this._attachCardListeners(htmlElement);
      this._attachBasicTabListeners(htmlElement);
    }

    _attachResourceListeners(htmlElement) {
      // Header click/right-click listeners for incrementing/decrementing
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

      // Pip click/right-click listeners for toggling to specific values
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

    _attachCompanionAttackListener(htmlElement) {
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
              '.card-controls, [data-action="useActorAttack"], .actor-attack-roll',
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

    async close(options = {}) {
      if (this.floatingTabs) {
        this.floatingTabs.close();
        this.floatingTabs = null;
      }
      return super.close(options);
    }

    async render(options = {}, _options = {}) {
      if (this.actor.limited && !this.actor.isOwner) {
        const systemSheet =
          CONFIG.Actor.sheetClasses.companion["daggerheart.DhCompanionSheet"];
        if (systemSheet) {
          const defaultSheet = new systemSheet.cls({ document: this.actor });
          return defaultSheet.render(true, _options);
        }
      }
      return super.render(options, _options);
    }
  }

  DocumentSheetConfig.registerSheet(Actor, "daggerheart", SleekCompanionSheet, {
    types: ["companion"],
    makeDefault: true,
    label: "DH Sleek UI",
  });
}
