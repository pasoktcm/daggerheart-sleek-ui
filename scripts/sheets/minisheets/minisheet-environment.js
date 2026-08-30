import { hideMacrobar, showMacrobar, collapseMinisheet, injectReopenButton, removeReopenButton, isMinisheetCollapsed, setMinisheetCollapsed, attachFavoritesListeners } from "./utils-minisheet.js";
import { applyMinisheetScale } from "../../settings.js";

export function registerEnvironmentMiniSheet() {
  if (game.system.id !== "daggerheart") return;
  if (!game.settings.get("daggerheart-sleek-ui", "enableMinisheet")) return;

  class EnvironmentMiniSheet {
    static currentActor = null;
    static element = null;
    static sceneMode = false;
    static sceneActors = [];
    static _tooltipPatched = false;
    static _outsideClickListener = null;
    static _featuresTransferTimeout = null;

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

    static _getSceneEnvironments() {
      if (!canvas.ready || !canvas.scene?.flags?.daggerheart) return [];

      const dhScene = new game.system.api.data.scenes.DHScene(canvas.scene.flags.daggerheart);
      return (dhScene.sceneEnvironments ?? []).filter(
        (actor) => actor?.type === "environment" && actor.testUserPermission(game.user, "LIMITED"),
      );
    }

    static _resolveActor() {
      const controlled = canvas.tokens?.controlled ?? [];
      if (controlled.length !== 1) return null;

      const token = controlled[0];
      const actor = token.actor;
      if (!actor || actor.type !== "environment") return null;

      const ownerLevel = game.user.isGM ? CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER : actor.getUserLevel(game.user);
      if (ownerLevel < CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER) return null;

      return actor;
    }

    static _syncDisplay({ deferScene = false } = {}) {
      const controlled = canvas.tokens?.controlled ?? [];

      if (controlled.length === 1) {
        const tokenActor = this._resolveActor();

        if (tokenActor) {
          if (tokenActor.sheet?.rendered) return;
          if (!this.sceneMode && tokenActor === this.currentActor && this.element) return;

          this.sceneMode = false;
          this.sceneActors = [];
          this.currentActor = tokenActor;
          this._render();
          return;
        }

        this._teardown();
        return;
      }

      if (controlled.length > 1) {
        this._teardown();
        return;
      }

      const syncScene = () => this._syncSceneDisplay();
      if (deferScene) queueMicrotask(syncScene);
      else syncScene();
    }

    static _syncSceneDisplay() {
      if ((canvas.tokens?.controlled ?? []).length > 0) return;

      const sceneEnvs = this._getSceneEnvironments();

      if (sceneEnvs.length >= 2) {
        this.sceneMode = true;
        this.sceneActors = sceneEnvs;
        this.currentActor = sceneEnvs[0];
        this._render();
        return;
      }

      if (sceneEnvs.length === 1) {
        this.sceneMode = false;
        this.sceneActors = [];
        this.currentActor = sceneEnvs[0];
        this._render();
        return;
      }

      this._teardown();
    }

    static _onControlToken(_token, controlled) {
      if (!controlled && canvas.tokens?.controlled.length) return;
      this._syncDisplay({ deferScene: !controlled });
    }

    static _onUpdateActor(actor) {
      if (this.sceneActors.some((a) => a.id === actor.id) || actor === this.currentActor) {
        this._render();
      }
    }

    static _onUpdateItem(item) {
      if (this.sceneActors.some((a) => a.id === item.parent?.id) || item.parent === this.currentActor) {
        this._render();
      }
    }

    static _getMinisheetRoot() {
      return (
        this.element?.querySelector(".scene-environ-minisheets") ??
        this.element?.querySelector(".minisheet-transform-wrapper > .minisheet.environment")
      );
    }

    static async _render() {
      if (!this.sceneMode && !this.currentActor) return;

      const favWasActive = !this.sceneMode && (this.element?.querySelector(".favorites-window")?.classList.contains("active") ?? false);

      let html;

      if (this.sceneMode) {
        const environments = await Promise.all(this.sceneActors.map((actor) => this._prepareContext(actor)));
        html = await foundry.applications.handlebars.renderTemplate(
          "modules/daggerheart-sleek-ui/templates/sheets/environments/environment-minisheet-scene.hbs",
          {
            environments,
            currentFear: game.settings.get(CONFIG.DH.id, CONFIG.DH.SETTINGS.gameSettings.Resources.Fear),
          },
        );
      } else {
        const context = await this._prepareContext(this.currentActor);
        if (!this.currentActor) return;

        html = await foundry.applications.handlebars.renderTemplate(
          "modules/daggerheart-sleek-ui/templates/sheets/environments/environment-minisheet.hbs",
          context,
        );
      }

      if (!this.element) {
        this._injectContainer();
      }

      this.element.querySelector(".minisheet-transform-wrapper").innerHTML = html;

      const collapsed = isMinisheetCollapsed();
      const minisheet = this._getMinisheetRoot();

      if (minisheet && !minisheet.querySelector(".toggle-minisheet.close")) {
        const closeBtn = document.createElement("button");
        closeBtn.classList.add("toggle-minisheet", "close");
        closeBtn.dataset.tooltip = "Close Mini Sheet";
        closeBtn.innerHTML = `<i class="fa-solid fa-chevron-down"></i>`;
        minisheet.appendChild(closeBtn);

        closeBtn.addEventListener("click", () => {
          setMinisheetCollapsed(true);
          collapseMinisheet(this.element, () => {
            injectReopenButton(() => {
              hideMacrobar();
              this.element.style.transition = "transform 0.3s ease";
              this.element.style.transform = `translateX(-50%)`;
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

      if (this.sceneMode) {
        const minisheets = this.element.querySelectorAll(".scene-environ-minisheets > .scene-environ-minisheets-container > .minisheet.environment");
        this.sceneActors.forEach((actor, index) => {
          const minisheetEl = minisheets[index];
          if (minisheetEl) this._attachListeners(minisheetEl, actor);
        });
        this._attachSceneExpandListeners();
      } else {
        if (favWasActive) {
          this.element.querySelector(".favorites-window")?.classList.add("active");
          this.element.querySelector(".tab-button")?.classList.add("active");
        }

        this._attachListeners(this.element, this.currentActor);
      }

      this._attachOutsideClickListener();
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
          setTimeout(() => applyMinisheetScale(), 310);
        });
      } else {
        this.element.style.transition = "";
        this.element.style.transform = `translateX(-50%)`;
        hideMacrobar();
        applyMinisheetScale();
      }
    }

    static _teardown() {
      removeReopenButton();

      clearTimeout(this._featuresTransferTimeout);
      this._featuresTransferTimeout = null;

      if (this._outsideClickListener) {
        document.removeEventListener("click", this._outsideClickListener);
        this._outsideClickListener = null;
      }

      this.currentActor = null;
      this.sceneMode = false;
      this.sceneActors = [];

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

      return {
        document: actor,
        source: actor,
        actor,
        isNPC: true,
        showTooltip: game.settings.get("daggerheart-sleek-ui", "showTooltip"),
        currentFear: game.settings.get(CONFIG.DH.id, CONFIG.DH.SETTINGS.gameSettings.Resources.Fear),
        environmentFeatures: systemContext.environmentFeatures ?? [],
      };
    }

    static _closeFeaturesWindow(minisheet) {
      if (!minisheet) return;
      minisheet.querySelector(".favorites-window")?.classList.remove("active");
      minisheet.querySelector(".tab-button.active")?.classList.remove("active");
    }

    static _openFeaturesWindow(minisheet) {
      if (!minisheet) return;
      minisheet.querySelector(".favorites-window")?.classList.add("active");
      minisheet.querySelector(".tab-button")?.classList.add("active");
    }

    static _closeAllFeaturesWindows(exceptMinisheet = null) {
      if (!this.element || !this.sceneMode) return;

      this.element.querySelectorAll(".scene-environ-minisheets > .scene-environ-minisheets-container > .minisheet.environment").forEach((root) => {
        if (root === exceptMinisheet) return;
        this._closeFeaturesWindow(root);
        root.closest(".scene-environ-minisheets-container")?.classList.remove("expanded");
      });
    }

    static _collapseSceneContainer(container) {
      if (!container) return;
      container.classList.remove("expanded");
      this._closeFeaturesWindow(container.querySelector(".minisheet.environment"));
    }

    static _attachSceneExpandListeners() {
      if (!this.element || !this.sceneMode) return;

      this.element.querySelectorAll(".scene-environ-minisheets-container").forEach((container) => {
        container.addEventListener("mouseenter", () => {
          const transferFeatures = !!this.element.querySelector(".scene-environ-minisheets-container.expanded");

          if (transferFeatures) {
            clearTimeout(this._featuresTransferTimeout);

            this.element.querySelectorAll(".scene-environ-minisheets-container.expanded").forEach((other) => {
              if (other === container) return;

              const otherFav = other.querySelector(".favorites-window");
              if (otherFav) otherFav.style.transition = "none";
              this._collapseSceneContainer(other);
              if (otherFav) {
                otherFav.offsetHeight;
                otherFav.style.transition = "";
              }
            });

            container.classList.add("expanded");

            const minisheet = container.querySelector(".minisheet.environment");
            this._featuresTransferTimeout = setTimeout(() => {
              this._featuresTransferTimeout = null;
              if (container.classList.contains("expanded")) {
                this._openFeaturesWindow(minisheet);
              }
            }, 75);
          } else {
            this.element.querySelectorAll(".scene-environ-minisheets-container.expanded").forEach((other) => {
              if (other !== container) this._collapseSceneContainer(other);
            });
          }
        });
      });
    }

    static _attachListeners(element, actor) {
      if (!element || !actor) return;

      element.querySelectorAll("[data-action='openSheet']").forEach((el) => {
        el.addEventListener("click", () => actor.sheet?.render(true));
      });

      this._attachCardListeners(element);
      attachFavoritesListeners(element, actor);

      element.querySelectorAll(".tab-button").forEach((btn) => {
        btn.addEventListener("click", (event) => {
          event.stopPropagation();
          const favWindow = element.querySelector(".favorites-window");
          const isActive = favWindow?.classList.contains("active");

          if (this.sceneMode) {
            const container = element.closest(".scene-environ-minisheets-container");
            if (!isActive) {
              this._closeAllFeaturesWindows(element);
              container?.classList.add("expanded");
            } else {
              container?.classList.remove("expanded");
            }
          }

          favWindow?.classList.toggle("active", !isActive);
          btn.classList.toggle("active", !isActive);
        });
      });
    }

    static _attachOutsideClickListener() {
      if (this._outsideClickListener) {
        document.removeEventListener("click", this._outsideClickListener);
      }

      this._outsideClickListener = (event) => {
        if (!this.element) return;

        if (this.sceneMode) {
          this.element.querySelectorAll(".scene-environ-minisheets-container.expanded").forEach((container) => {
            if (!container.contains(event.target)) {
              this._collapseSceneContainer(container);
            }
          });
          return;
        }

        const roots = [this.element];

        roots.forEach((root) => {
          const favWindow = root.querySelector(".favorites-window");
          if (!favWindow?.classList.contains("active")) return;
          if (!favWindow.contains(event.target) && !event.target.closest(".tab-button")) {
            this._closeFeaturesWindow(root);
          }
        });
      };

      document.addEventListener("click", this._outsideClickListener);
    }

    static _attachCardListeners(element) {
      element.querySelectorAll(".card-text, .card-resource").forEach((nameContainer) => {
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

  Hooks.on("ready", () => EnvironmentMiniSheet._syncDisplay());
  Hooks.on("canvasReady", () => EnvironmentMiniSheet._syncDisplay());
  Hooks.on("controlToken", EnvironmentMiniSheet._onControlToken.bind(EnvironmentMiniSheet));
  Hooks.on("updateActor", EnvironmentMiniSheet._onUpdateActor.bind(EnvironmentMiniSheet));
  Hooks.on("updateItem", EnvironmentMiniSheet._onUpdateItem.bind(EnvironmentMiniSheet));

  Hooks.on("updateScene", (scene, changes) => {
    if (changes.active !== undefined && scene.active) {
      EnvironmentMiniSheet._syncDisplay();
      return;
    }

    if (scene.id === canvas.scene?.id && foundry.utils.hasProperty(changes, "flags.daggerheart.sceneEnvironments")) {
      EnvironmentMiniSheet._syncDisplay();
    }
  });

  Hooks.on("renderSleekEnvironmentSheet", (app) => {
    if (EnvironmentMiniSheet.sceneMode && EnvironmentMiniSheet.sceneActors.some((a) => a === app.actor)) {
      clearTimeout(EnvironmentMiniSheet._featuresTransferTimeout);
      EnvironmentMiniSheet._featuresTransferTimeout = null;
      EnvironmentMiniSheet._closeAllFeaturesWindows();
      return;
    }

    if (app.actor === EnvironmentMiniSheet.currentActor && !EnvironmentMiniSheet.sceneMode) {
      EnvironmentMiniSheet._teardown();
    }
  });

  Hooks.on("closeSleekEnvironmentSheet", () => {
    EnvironmentMiniSheet._syncDisplay();
  });

  Hooks.on("updateSetting", (setting) => {
    if (setting.key !== `${CONFIG.DH.id}.${CONFIG.DH.SETTINGS.gameSettings.Resources.Fear}`) return;
    if (EnvironmentMiniSheet.sceneActors.length || EnvironmentMiniSheet.currentActor) {
      EnvironmentMiniSheet._render();
    }
  });

  if (canvas.ready) EnvironmentMiniSheet._syncDisplay();
}
