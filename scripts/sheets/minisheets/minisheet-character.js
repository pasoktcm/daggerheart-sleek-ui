import {
  hideMacrobar,
  collapseMinisheet,
  injectReopenButton,
  removeReopenButton,
  isMinisheetCollapsed,
  setMinisheetCollapsed,
  showMacrobar,
  attachResourceListeners,
  attachToggleResourceListeners,
  attachHopeListeners,
  attachTraitRollListeners,
  attachFavoritesListeners,
  renderFavorites,
  attachDowntimeListeners,
} from "./utils-minisheet.js";

import { applyMinisheetScale } from "../../settings.js";

export function registerCharacterMiniSheet() {
  if (game.system.id !== "daggerheart") return;
  if (!game.settings.get("daggerheart-sleek-ui", "enableMinisheet")) return;

  class CharacterMiniSheet {
    static currentActor = null;
    static element = null;
    static _tooltipPatched = false;
    static _effectsObserver = null;
    static _effectsOriginalParent = null;
    static _outsideClickListener = null;

    static _mountEffectsDisplay() {
      const effectsEl = document.getElementById("effects-display");
      if (!effectsEl) return;

      const minisheet = this.element?.querySelector(".minisheet.character");
      if (!minisheet) return;

      this._effectsOriginalParent = effectsEl.parentElement;
      minisheet.appendChild(effectsEl);
      effectsEl.removeAttribute("hidden");

      this._effectsObserver = new MutationObserver(() => effectsEl.removeAttribute("hidden"));
      this._effectsObserver.observe(effectsEl, { attributes: true, attributeFilter: ["hidden"] });
    }

    static _unmountEffectsDisplay() {
      const effectsEl = document.getElementById("effects-display");

      if (this._effectsObserver) {
        this._effectsObserver.disconnect();
        this._effectsObserver = null;
      }

      if (effectsEl && this._effectsOriginalParent) {
        this._effectsOriginalParent.appendChild(effectsEl);
      }

      this._effectsOriginalParent = null;
    }

    static _patchTooltipManager() {
      if (this._tooltipPatched) return;
      const mgr = game.tooltip;
      if (!mgr) return;

      const originalSetAnchor = mgr._setAnchor.bind(mgr);
      mgr._setAnchor = function (direction) {
        if (this.element?.closest("#sleek-ui-sheet .minisheet") && !this.element?.closest(".favorites-window")) {
          const pad = this.constructor.TOOLTIP_MARGIN_PX;
          const pos = this.element.getBoundingClientRect();
          return this._setStyle({
            textAlign: "center",
            left: pos.left - this.tooltip.offsetWidth / 2 + pos.width / 2,
            bottom: window.innerHeight - pos.top + pad,
          });
        }
        return originalSetAnchor(direction);
      };

      this._tooltipPatched = true;
    }

    static _onControlToken(token, controlled) {
      if (!controlled) {
        if (!canvas.tokens?.controlled.length) CharacterMiniSheet._teardown();
        return;
      }

      const actor = CharacterMiniSheet._resolveActor();

      if (!actor) {
        CharacterMiniSheet._teardown();
        return;
      }

      if (actor === CharacterMiniSheet.currentActor) return;
      if (actor.sheet?.rendered) return;

      CharacterMiniSheet.currentActor = actor;
      CharacterMiniSheet._render();
    }

    static _onUpdateActor(actor) {
      if (actor === this.currentActor) this._render();
    }

    static _onUpdateItem(item) {
      if (item.parent !== this.currentActor) return;
      if (item === this.currentActor.system.armor) {
        this._render();
      } else {
        this._renderFavorites();
      }
    }

    static _resolveActor() {
      const controlled = canvas.tokens?.controlled ?? [];
      if (controlled.length !== 1) return null;

      const token = controlled[0];
      const actor = token.actor;
      if (!actor || actor.type !== "character") return null;

      const ownerLevel = game.user.isGM ? CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER : actor.getUserLevel(game.user);
      if (ownerLevel < CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER) return null;

      return actor;
    }

    static async _render() {
      if (!this.currentActor) return;

      // Preserve favorites window open state across re-renders
      const favWasActive = this.element?.querySelector(".favorites-window")?.classList.contains("active") ?? false;

      const effectsEl = document.getElementById("effects-display");
      const wasInMinisheet = effectsEl && this.element?.contains(effectsEl);
      if (wasInMinisheet) document.body.appendChild(effectsEl);

      const context = await this._prepareContext(this.currentActor);
      if (!this.currentActor) return;

      const html = await foundry.applications.handlebars.renderTemplate("modules/daggerheart-sleek-ui/templates/sheets/characters/minisheet.hbs", context);
      if (!this.currentActor) return;

      if (!this.element) {
        this._injectContainer();
        hideMacrobar();
      }

      const scaleWrapper = this.element.querySelector(".minisheet-transform-wrapper");
      scaleWrapper.innerHTML = html;

      const collapsed = isMinisheetCollapsed();

      // Inject close button into the minisheet
      const minisheet = this.element.querySelector(".minisheet");
      if (minisheet) {
        const closeBtn = document.createElement("button");
        closeBtn.classList.add("toggle-minisheet", "close");
        closeBtn.dataset.tooltip = "Close Mini Sheet";
        closeBtn.innerHTML = `<i class="fa-solid fa-chevron-down"></i>`;
        minisheet.appendChild(closeBtn);

        closeBtn.addEventListener("click", () => {
          setMinisheetCollapsed(true);
          collapseMinisheet(this.element, () => {
            this._unmountEffectsDisplay();
            injectReopenButton(() => {
              hideMacrobar();
              this.element.style.transition = "transform 0.3s ease";
              this.element.style.transform = `translateX(-50%)`;
              this._mountEffectsDisplay();
              setTimeout(() => applyMinisheetScale(), 310);
            });

            // Animate macrobar up
            const hotbar = document.getElementById("hotbar");
            if (hotbar) {
              hotbar.style.transition = "none";
              hotbar.style.transform = `translateY(100%)`;
              hotbar.style.display = "";
              // Force reflow so the initial transform is applied before animating
              hotbar.offsetHeight;
              hotbar.style.transition = "transform 0.3s ease";
              hotbar.style.transform = `translateY(0)`;
            }
          });
        });
      }

      // Restore favorites window state
      if (favWasActive) {
        const favWindow = this.element.querySelector(".favorites-window");
        const tabBtn = this.element.querySelector(".tab-button");
        favWindow?.classList.add("active");
        tabBtn?.classList.add("active");
      }

      this._attachListeners();
      this._patchTooltipManager(); // skip in party minisheet, it doesn't have this

      if (collapsed) {
        const height = this.element.offsetHeight;
        this.element.style.transition = "none";
        this.element.style.transform = `translateX(-50%) translateY(${height + 58}px)`;
        showMacrobar();
        injectReopenButton(() => {
          hideMacrobar();
          this.element.style.transition = "transform 0.3s ease";
          this.element.style.transform = `translateX(-50%)`;
          this._mountEffectsDisplay();
          setTimeout(() => applyMinisheetScale(), 310);
        });
      } else {
        this.element.style.transition = "";
        this.element.style.transform = `translateX(-50%)`;
        applyMinisheetScale();
      }

      // Effects display — only mount if not collapsed
      if (wasInMinisheet && !collapsed) {
        const ms = this.element.querySelector(".minisheet");
        if (ms) {
          ms.appendChild(effectsEl);
          effectsEl.removeAttribute("hidden");
        }
      } else if (!collapsed) {
        this._mountEffectsDisplay();
      }
    }

    static async _renderFavorites() {
      if (!this.currentActor || !this.element) return;

      const context = await this._prepareContext(this.currentActor);
      await renderFavorites(this.element, this.currentActor, "modules/daggerheart-sleek-ui/templates/sheets/characters/main/favorites.hbs", context);
    }

    static _teardown() {
      this._unmountEffectsDisplay();
      removeReopenButton();

      if (this._outsideClickListener) {
        document.removeEventListener("click", this._outsideClickListener);
        this._outsideClickListener = null;
      }

      this.currentActor = null;

      if (this.element) {
        this.element.remove();
        this.element = null;
      }

      showMacrobar();
    }

    static _injectContainer() {
      const container = document.createElement("div");
      container.id = "sleek-ui-sheet";
      container.style.cssText = "position:fixed;bottom:0;left:50%;transform:translateX(-50%);z-index:70;";

      const scaleWrapper = document.createElement("div");
      scaleWrapper.classList.add("minisheet-transform-wrapper");
      scaleWrapper.style.transformOrigin = "bottom center";

      const value = game.settings.get("daggerheart-sleek-ui", "minisheetScale");
      scaleWrapper.style.transform = `scale(${value})`;

      container.appendChild(scaleWrapper);
      document.body.appendChild(container);
      this.element = container;
    }

    static async _prepareContext(actor) {
      const systemContext = await actor.sheet._prepareContext({});

      let { weapons, armors, loadoutCards, quickAccess, quickAccessItems, unarmedAttack } = systemContext;

      const isSleekSheet = actor.sheet?.constructor?.name === "SleekCharacterSheet";

      if (!isSleekSheet) {
        weapons = actor.items.filter((i) => i.type === "weapon").map((item) => ({ item, tags: [], hopeCost: 0, usesData: null, enrichedDescription: "" }));

        armors = actor.items
          .filter((i) => i.type === "armor")
          .map((item) => ({
            item,
            tags: [],
            hopeCost: 0,
            usesData: null,
            marks: item.system.marks ?? null,
            enrichedDescription: "",
          }));

        loadoutCards = (actor.system.domainCards?.loadout ?? []).map((item) => ({
          item,
          tags: [],
          hopeCost: 0,
          usesData: null,
        }));

        unarmedAttack = actor.system.usedUnarmed
          ? {
              item: actor.system.usedUnarmed,
              tags: [],
              hopeCost: 0,
              usesData: null,
              damage: actor.system.usedUnarmed?.system?.damage ?? null,
              enrichedDescription: "",
            }
          : null;

        quickAccess = false;
        quickAccessItems = [];
      }

      return {
        document: actor,
        source: actor,
        actor,
        ownershipLevel: game.user.isGM ? CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER : actor.getUserLevel(game.user),
        showTooltip: true,
        attributes: systemContext.attributes,
        isDeath: actor.system.deathMoveViable,
        beastformPortrait: systemContext.beastformPortrait,
        quickAccess,
        quickAccessItems,
        unarmedAttack,
        weapons,
        armors,
        loadoutCards,
      };
    }

    static _attachListeners() {
      if (!this.element || !this.currentActor) return;

      const actor = this.currentActor;

      attachHopeListeners(this.element, actor);
      attachResourceListeners(this.element, actor);
      attachToggleResourceListeners(this.element, actor);
      attachTraitRollListeners(this.element, actor);
      attachDowntimeListeners(this.element, actor);

      this.element.querySelectorAll("[data-action='openSheet']").forEach((el) => {
        el.addEventListener("click", () => actor.sheet?.render(true));
      });

      this.element.querySelectorAll("[data-action='makeDeathMove']").forEach((el) => {
        el.addEventListener("click", async () => {
          await new game.system.api.applications.dialogs.DeathMove(actor).render({ force: true });
        });
      });

      attachFavoritesListeners(this.element, actor);

      // Tab button toggle
      this.element.querySelectorAll(".tab-button").forEach((btn) => {
        btn.addEventListener("click", (event) => {
          event.stopPropagation();
          const favWindow = this.element.querySelector(".favorites-window");
          const isActive = favWindow?.classList.contains("active");
          favWindow?.classList.toggle("active", !isActive);
          btn.classList.toggle("active", !isActive);
        });
      });

      // Close on outside click — remove previous listener before adding new one
      if (this._outsideClickListener) {
        document.removeEventListener("click", this._outsideClickListener);
      }

      this._outsideClickListener = (event) => {
        if (!this.element) return;
        const favWindow = this.element.querySelector(".favorites-window");
        if (!favWindow?.classList.contains("active")) return;
        if (!favWindow.contains(event.target) && !event.target.closest(".tab-button")) {
          favWindow.classList.remove("active");
          this.element.querySelector(".tab-button.active")?.classList.remove("active");
        }
      };

      document.addEventListener("click", this._outsideClickListener);
    }
  }

  Hooks.on("controlToken", CharacterMiniSheet._onControlToken.bind(CharacterMiniSheet));
  Hooks.on("updateActor", CharacterMiniSheet._onUpdateActor.bind(CharacterMiniSheet));
  Hooks.on("updateItem", CharacterMiniSheet._onUpdateItem.bind(CharacterMiniSheet));

  Hooks.on("renderSleekCharacterSheet", (app) => {
    if (app.actor === CharacterMiniSheet.currentActor) {
      CharacterMiniSheet._teardown();
    }
  });

  Hooks.on("closeSleekCharacterSheet", (app) => {
    const actor = CharacterMiniSheet._resolveActor();
    if (actor && app.actor === actor) {
      CharacterMiniSheet.currentActor = actor;
      CharacterMiniSheet._render();
    }
  });
}
