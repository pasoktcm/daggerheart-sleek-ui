import { FloatingTabs } from "../floating-tabs.js";

export function registerEnvironmentSheet() {
  if (game.system.id !== "daggerheart") return;

  const registeredSheets = CONFIG.Actor.sheetClasses.environment || {};
  const daggerheartSheet = registeredSheets["daggerheart.DhpEnvironment"];
  if (!daggerheartSheet) return;

  const DaggerheartEnvironmentSheet = daggerheartSheet.cls;

  class SleekEnvironmentSheet extends DaggerheartEnvironmentSheet {
    collapsedCategories = [];
    openCards = new Set();
    tabs = {};
    floatingTabs = null;

    static DEFAULT_OPTIONS = foundry.utils.mergeObject(
      super.DEFAULT_OPTIONS,
      {
        classes: ["daggerheart", "sheet", "actor", "sleek-ui", "sleek-environment"],
        window: { controls: [] },
        position: { width: 540, height: 900 },
        actions: {
          toggleCategory: SleekEnvironmentSheet._onToggleCategory,
        },
      },
      { inplace: false },
    );

    static PARTS = {
      mainSheet: {
        template: "modules/daggerheart-sleek-ui/templates/sheets/environments/environment-sheet-main.hbs",
      },
      limited: {
        template: "systems/daggerheart/templates/sheets/actors/environment/limited.hbs",
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

      context.tabsPosition = game.settings.get("daggerheart-sleek-ui", "tabsPosition");
      context.showTooltip = game.settings.get("daggerheart-sleek-ui", "showTooltip");

      await this._prepareNotesContext(context, options);

      if (Object.keys(this.tabs).length === 0) {
        this.tabs = {
          features: {
            id: "features",
            label: game.i18n.localize("DAGGERHEART.GENERAL.Tabs.features"),
            icon: "fa-solid fa-list-ul",
            active: true,
          },
          potentialAdversaries: {
            id: "potentialAdversaries",
            label: game.i18n.localize("DAGGERHEART.GENERAL.Tabs.potentialAdversaries"),
            icon: "fa-solid fa-users",
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

      context.currentFear = game.settings.get(CONFIG.DH.id, CONFIG.DH.SETTINGS.gameSettings.Resources.Fear);

      if (options.isFirstRender && !this.collapsedCategories) {
        this.collapsedCategories = this.actor.getFlag("daggerheart-sleek-ui", "collapsedCategories") || [];
      }
      context.collapsedCategories = this.collapsedCategories || [];

      // Environment-specific fields
      context.environmentType = this.actor.system.type;
      context.environmentTypes = CONFIG.DH.ACTOR.environmentTypes;
      context.difficulty = this.actor.system.difficulty;

      // Enrich description and impulses
      context.enrichedDescription = await foundry.applications.ux.TextEditor.enrichHTML(this.actor.system.description ?? "", { relativeTo: this.actor, rollData: this.actor.getRollData() });
      context.enrichedImpulses = await foundry.applications.ux.TextEditor.enrichHTML(this.actor.system.impulses ?? "", { relativeTo: this.actor, rollData: this.actor.getRollData() });

      await this._prepareFeaturesData(context);
      await this._preparePotentialAdversariesData(context);

      return context;
    }

    async _prepareFeaturesData(context) {
      const featureForms = ["passive", "action", "reaction"];
      const sortedFeatures = (this.actor.system.features ?? []).sort((a, b) => (a.system.featureForm !== b.system.featureForm ? featureForms.indexOf(a.system.featureForm) - featureForms.indexOf(b.system.featureForm) : a.sort - b.sort));

      context.environmentFeatures = await Promise.all(
        sortedFeatures.map(async (item) => {
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

          const enrichedDescription = await foundry.applications.ux.TextEditor.enrichHTML(item.system.description, { relativeTo: item, rollData: this.actor.getRollData() });

          const tags = [
            {
              label: game.i18n.localize(`DAGGERHEART.CONFIG.FeatureForm.${item.system.featureForm}`),
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

    async _preparePotentialAdversariesData(context) {
      const rawCategories = this.actor.system.potentialAdversaries ?? {};

      context.adversaryCategories = await Promise.all(
        Object.entries(rawCategories).map(async ([categoryId, categoryData]) => {
          const adversaries = await Promise.all(
            (categoryData.adversaries ?? []).map(async (adversaryOrUuid) => {
              // The field may give us a resolved world actor, or null for compendium entries
              let adversary = adversaryOrUuid;

              // If unresolved (null/undefined), or if it's a string UUID, fetch it
              if (!adversary || typeof adversary === "string") {
                adversary = await fromUuid(adversaryOrUuid);
              }

              // If it resolved to an actor but system data isn't populated, fetch by UUID
              if (adversary && !adversary.system?.tier && !adversary.system?.type) {
                adversary = await fromUuid(adversary.uuid);
              }

              if (!adversary) return null;

              return {
                uuid: adversary.uuid,
                name: adversary.name,
                img: adversary.img,
                tier: adversary.system?.tier ?? null,
                type: adversary.system?.type ?? null,
                typeName: adversary.system?.type ? game.i18n.localize(CONFIG.DH.ACTOR.adversaryTypes?.[adversary.system.type]?.label ?? adversary.system.type) : null,
              };
            }),
          );

          return {
            categoryId,
            label: categoryData.label,
            adversaries: adversaries.filter(Boolean),
          };
        }),
      );
    }

    async _prepareNotesContext(context, options) {
      const value = this.actor.system.notes ?? "";
      context.notes = {
        field: this.actor.system.schema.getField("notes"),
        value,
        enriched: await foundry.applications.ux.TextEditor.enrichHTML(value, {
          relativeTo: this.document,
          rollData: this.actor.getRollData(),
        }),
      };
    }

    _onRender(context, options) {
      super._onRender(context, options);

      this.element.id = "sleek-ui-sheet";
      this._element = this.element;

      this.element.addEventListener("mousemove", (e) => {
        const hoveredElement = document.elementFromPoint(e.clientX, e.clientY);
        const isOverTooltipTrigger = hoveredElement?.closest("[data-tooltip], [data-tooltip-text]");
        if (!isOverTooltipTrigger) {
          const tooltip = document.querySelector(".tooltip.active");
          if (tooltip) tooltip.remove();
        }
      });

      const tabsPosition = game.settings.get("daggerheart-sleek-ui", "tabsPosition");

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
        const header = this.element.querySelector(`.card-container.header[data-item-uuid="${uuid}"]`);
        if (header) {
          const cardWrapper = header.closest(".card-wrapper");
          const description = cardWrapper?.querySelector(".card-container.description");
          if (description) {
            description.style.display = "flex";
          }
        }
      });
    }

    _attachPartListeners(partId, htmlElement, options) {
      super._attachPartListeners?.(partId, htmlElement, options);
      this._attachCardListeners(htmlElement);
      this._attachUsesListeners(htmlElement);
      this._attachActionListeners(htmlElement);
      this._attachBasicTabListeners(htmlElement);
    }

    _attachCardListeners(htmlElement) {
      const cardNameContainers = htmlElement.querySelectorAll(".card-text, .card-resource");
      cardNameContainers.forEach((nameContainer) => {
        nameContainer.addEventListener("click", (event) => {
          if (event.target.closest('.card-controls, [data-action="useItem"], [data-action="useAction"], .uses-resource, .simple-resource, .die-resource, .dice-resource')) return;

          const cardWrapper = nameContainer.closest(".card-wrapper");
          if (!cardWrapper) return;

          const description = cardWrapper.querySelector(".card-container.description");
          const itemUuid = nameContainer.closest("[data-item-uuid]")?.dataset.itemUuid;

          if (description && itemUuid) {
            const isCurrentlyHidden = description.style.display === "none" || !description.style.display;
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

          const itemUuid = element.closest("[data-item-uuid]")?.dataset.itemUuid;
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

            const itemUuid = element.closest("[data-item-uuid]")?.dataset.itemUuid;
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

    _attachActionListeners(htmlElement) {
      htmlElement.querySelectorAll('[data-action="useAction"]').forEach((button) => {
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
      this.actor.setFlag("daggerheart-sleek-ui", "collapsedCategories", [...this.collapsedCategories]);
    }

    async render(options = {}, _options = {}) {
      if (this.actor.limited && !this.actor.isOwner) {
        const systemSheet = CONFIG.Actor.sheetClasses.environment["daggerheart.DhpEnvironment"];
        if (systemSheet) {
          const defaultSheet = new systemSheet.cls({ document: this.actor });
          return defaultSheet.render(true, _options);
        }
      }
      return super.render(options, _options);
    }
  }

  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, "daggerheart", SleekEnvironmentSheet, {
    types: ["environment"],
    makeDefault: true,
    label: "DH Sleek UI",
  });

  Hooks.on("updateSetting", (setting) => {
    if (setting.key !== `${CONFIG.DH.id}.${CONFIG.DH.SETTINGS.gameSettings.Resources.Fear}`) return;

    canvas.tokens.placeables
      .filter((t) => t.actor?.type === "environment")
      .forEach((t) => {
        const sheet = t.actor?.sheet;
        if (sheet instanceof SleekEnvironmentSheet && sheet.rendered) {
          sheet.render();
        }
      });
  });
}
