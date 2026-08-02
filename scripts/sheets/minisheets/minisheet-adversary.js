import { hideMacrobar, showMacrobar, collapseMinisheet, injectReopenButton, removeReopenButton, isMinisheetCollapsed, setMinisheetCollapsed, attachResourceListeners, attachToggleResourceListeners, attachFavoritesListeners, attachReactionRollListeners } from "./utils-minisheet.js";
import { applyMinisheetScale } from "../../settings.js";

export function registerAdversaryMiniSheet() {
  if (game.system.id !== "daggerheart") return;
  if (!game.settings.get("daggerheart-sleek-ui", "enableMinisheet")) return;

  class AdversaryMiniSheet {
    static currentActor = null;
    static element = null;
    static _tooltipPatched = false;
    static _effectsObserver = null;
    static _effectsOriginalParent = null;
    static _outsideClickListener = null;

    // ─── TOOLTIP PATCH ────────────────────────────────────────────────────────

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

    // ─── EFFECTS DISPLAY ─────────────────────────────────────────────────────

    static _mountEffectsDisplay() {
      const effectsEl = document.getElementById("effects-display");
      if (!effectsEl) return;

      const minisheet = this.element?.querySelector(".minisheet.adversary");
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

    // ─── HOOKS ────────────────────────────────────────────────────────────────

    static _onControlToken(token, controlled) {
      if (!controlled) {
        if (!canvas.tokens?.controlled.length) AdversaryMiniSheet._teardown();
        return;
      }

      const actor = AdversaryMiniSheet._resolveActor();

      if (!actor) {
        AdversaryMiniSheet._teardown();
        return;
      }

      if (actor === AdversaryMiniSheet.currentActor) return;
      if (actor.sheet?.rendered) return;

      AdversaryMiniSheet.currentActor = actor;
      AdversaryMiniSheet._render();
    }

    static _onUpdateActor(actor) {
      if (actor === this.currentActor) this._render();
    }

    static _onUpdateItem(item) {
      if (item.parent !== this.currentActor) return;
      this._render();
    }

    // ─── ACTOR RESOLUTION ────────────────────────────────────────────────────

    static _resolveActor() {
      const controlled = canvas.tokens?.controlled ?? [];
      if (controlled.length !== 1) return null;

      const token = controlled[0];
      const actor = token.actor;
      if (!actor || actor.type !== "adversary") return null;

      // GMs can always see adversaries; players need ownership
      const ownerLevel = game.user.isGM ? CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER : actor.getUserLevel(game.user);
      if (ownerLevel < CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER) return null;

      return actor;
    }

    // ─── RENDER ───────────────────────────────────────────────────────────────

    static async _render() {
      if (!this.currentActor) return;

      // Preserve features window open state across re-renders
      const favWasActive = this.element?.querySelector(".favorites-window")?.classList.contains("active") ?? false;

      const effectsEl = document.getElementById("effects-display");
      const wasInMinisheet = effectsEl && this.element?.contains(effectsEl);
      if (wasInMinisheet) document.body.appendChild(effectsEl);

      const context = await this._prepareContext(this.currentActor);
      if (!this.currentActor) return;

      const html = await foundry.applications.handlebars.renderTemplate("modules/daggerheart-sleek-ui/templates/sheets/adversaries/adversary-minisheet.hbs", context);
      if (!this.currentActor) return;

      if (!this.element) {
        this._injectContainer();
        hideMacrobar();
      }

      const scaleWrapper = this.element.querySelector(".minisheet-transform-wrapper");
      scaleWrapper.innerHTML = html;

      const collapsed = isMinisheetCollapsed();

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

            const hotbar = document.getElementById("hotbar");
            if (hotbar) {
              hotbar.style.transition = "none";
              hotbar.style.transform = `translateY(100%)`;
              hotbar.style.display = "";
              hotbar.offsetHeight;
              hotbar.style.transition = "transform 0.3s ease";
              hotbar.style.transform = `translateY(0)`;
            }
          });
        });
      }

      if (favWasActive) {
        const favWindow = this.element.querySelector(".favorites-window");
        const tabBtn = this.element.querySelector(".tab-button");
        favWindow?.classList.add("active");
        tabBtn?.classList.add("active");
      }

      this._attachListeners();
      this._patchTooltipManager();

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

    // ─── CONTEXT ─────────────────────────────────────────────────────────────

    static async _prepareContext(actor) {
      // Reuse the system sheet's own _prepareContext so we get features,
      // enriched descriptions, usesData, fearCost, tags, etc. for free.
      const systemContext = await actor.sheet._prepareContext({});

      // Build attackDamage string
      const part = actor.system.attack.damage.main ?? actor.system.attack.damage.parts.hitPoints;
      const multiplier = part?.value.flatMultiplier ?? 1;
      const dice = part?.value.dice ?? "";
      const bonus = part?.value.bonus ?? 0;
      const attackDamage = `${multiplier}${dice}${bonus > 0 ? " + " + bonus : bonus < 0 ? bonus : ""}`;
      const attackDamageType = part ? [...part.type] : [];

      return {
        document: actor,
        source: actor,
        actor,
        isNPC: true,
        showTooltip: true,
        currentFear: game.settings.get(CONFIG.DH.id, CONFIG.DH.SETTINGS.gameSettings.Resources.Fear),
        adversaryFeatures: systemContext.adversaryFeatures ?? [],
        attackDamage,
        attackDamageType,
        attack: actor.system.attack,
      };
    }

    // ─── LISTENERS ───────────────────────────────────────────────────────────

    static _attachListeners() {
      if (!this.element || !this.currentActor) return;

      const actor = this.currentActor;

      // Resource pips & modify buttons (shared utils handle the adversary paths fine)
      attachResourceListeners(this.element, actor);
      attachToggleResourceListeners(this.element, actor);
      attachReactionRollListeners(this.element, actor);

      // Open full sheet on portrait click
      this.element.querySelectorAll("[data-action='openSheet']").forEach((el) => {
        el.addEventListener("click", () => actor.sheet?.render(true));
      });

      // Actor attack — rolls damage via the system action workflow
      this.element.querySelectorAll("[data-action='useActorAttack']").forEach((el) => {
        el.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const action = actor.system.attack;
          await action.use(event);
        });
      });

      // Actor attack damage roll (the damage chip in the attack card)
      this.element.querySelectorAll(".actor-attack-roll").forEach((el) => {
        el.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const action = actor.system.attack;
          const config = action.prepareConfig(event);
          config.effects = await game.system.api.data.actions.actionsTypes.base.getActionRelevantEffects(actor, null);
          config.hasRoll = false;
          action.workflow.get("damage").execute(config, null, true);
        });
      });

      // Card expand/collapse (feature cards show description on click)
      this._attachCardListeners();

      // Feature uses, simple/die/dice resources, item actions — delegated to the
      // same helpers that utils-minisheet exposes for favorites windows, since
      // the card markup is identical.
      attachFavoritesListeners(this.element, actor);

      // Features panel toggle (tab-button opens/closes the favorites-window)
      this.element.querySelectorAll(".tab-button").forEach((btn) => {
        btn.addEventListener("click", (event) => {
          event.stopPropagation();
          const favWindow = this.element.querySelector(".favorites-window");
          const isActive = favWindow?.classList.contains("active");
          favWindow?.classList.toggle("active", !isActive);
          btn.classList.toggle("active", !isActive);
        });
      });

      // Close the features panel when clicking outside
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

    // Card expand/collapse for feature cards in the features panel.
    // Mirrors the logic in SleekAdversarySheet._attachCardListeners but without
    // needing to persist openCards across re-renders (minisheet re-renders fully).
    static _attachCardListeners() {
      this.element.querySelectorAll(".card-text, .card-resource").forEach((nameContainer) => {
        nameContainer.addEventListener("click", (event) => {
          if (event.target.closest('.card-controls, [data-action="useItem"], [data-action="useActorAttack"], [data-action="useAction"], .uses-resource, .actor-attack-roll, .simple-resource, .die-resource, .dice-resource')) return;

          const cardWrapper = nameContainer.closest(".card-wrapper");
          if (!cardWrapper) return;

          const description = cardWrapper.querySelector(".card-container.description");
          if (description) {
            const isHidden = description.style.display === "none" || !description.style.display;
            description.style.display = isHidden ? "flex" : "none";
          }
        });
      });
    }
  }

  // ─── HOOKS ─────────────────────────────────────────────────────────────────

  Hooks.on("controlToken", AdversaryMiniSheet._onControlToken.bind(AdversaryMiniSheet));
  Hooks.on("updateActor", AdversaryMiniSheet._onUpdateActor.bind(AdversaryMiniSheet));
  Hooks.on("updateItem", AdversaryMiniSheet._onUpdateItem.bind(AdversaryMiniSheet));

  // Tear down when the full sheet opens for this actor
  Hooks.on("renderSleekAdversarySheet", (app) => {
    if (app.actor === AdversaryMiniSheet.currentActor) {
      AdversaryMiniSheet._teardown();
    }
  });

  // Re-mount when the full sheet is closed and the token is still selected
  Hooks.on("closeSleekAdversarySheet", (app) => {
    const actor = AdversaryMiniSheet._resolveActor();
    if (actor && app.actor === actor) {
      AdversaryMiniSheet.currentActor = actor;
      AdversaryMiniSheet._render();
    }
  });

  Hooks.on("updateSetting", (setting) => {
    if (setting.key !== `${CONFIG.DH.id}.${CONFIG.DH.SETTINGS.gameSettings.Resources.Fear}`) return;
    if (AdversaryMiniSheet.currentActor) AdversaryMiniSheet._render();
  });
}
