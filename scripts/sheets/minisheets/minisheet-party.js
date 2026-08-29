import { hideMacrobar, showMacrobar, collapseMinisheet, injectReopenButton, removeReopenButton, isMinisheetCollapsed, setMinisheetCollapsed } from "./utils-minisheet.js";
import { applyMinisheetScale } from "../../settings.js";
import { getBeastformPortrait } from "../../helpers.js";

export function registerPartyMiniSheet() {
  if (game.system.id !== "daggerheart") return;
  if (!game.settings.get("daggerheart-sleek-ui", "enableMinisheet")) return;

  class PartyMiniSheet {
    static currentActor = null;
    static element = null;

    // ─── HOOKS ────────────────────────────────────────────────────────────────

    static _onControlToken(_token, controlled) {
      if (!controlled) {
        if (!canvas.tokens?.controlled.length) PartyMiniSheet._teardown();
        return;
      }

      const actor = PartyMiniSheet._resolveActor();

      if (!actor) {
        PartyMiniSheet._teardown();
        return;
      }

      if (actor === PartyMiniSheet.currentActor) return;
      if (actor.sheet?.rendered) return;

      PartyMiniSheet.currentActor = actor;
      PartyMiniSheet._render();
    }

    static _onUpdateActor(actor) {
      if (actor === this.currentActor) {
        this._render();
        return;
      }
      const isPartyMember = this.currentActor?.system.partyMembers?.some((m) => m === actor);
      if (isPartyMember) this._render();
    }

    // ─── ACTOR RESOLUTION ────────────────────────────────────────────────────

    static _resolveActor() {
      const controlled = canvas.tokens?.controlled ?? [];
      if (controlled.length !== 1) return null;

      const token = controlled[0];
      const actor = token.actor;
      if (!actor || actor.type !== "party") return null;

      const ownerLevel = game.user.isGM ? CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER : actor.getUserLevel(game.user);
      if (ownerLevel < CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER) return null;

      return actor;
    }

    // ─── RENDER ───────────────────────────────────────────────────────────────

    static async _render() {
      if (!this.currentActor) return;

      const context = await this._prepareContext(this.currentActor);
      if (!this.currentActor) return;

      const html = await foundry.applications.handlebars.renderTemplate("modules/daggerheart-sleek-ui/templates/sheets/party/party-minisheet.hbs", context);
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

      this._attachListeners();

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
        applyMinisheetScale();
      }
    }

    static _teardown() {
      removeReopenButton();

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
      const members = [...(actor.system.partyMembers ?? [])].sort((a, b) => {
        const ownershipA = game.user.isGM ? CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER : a.getUserLevel(game.user);
        const ownershipB = game.user.isGM ? CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER : b.getUserLevel(game.user);
        if (ownershipB !== ownershipA) return ownershipB - ownershipA;
        return a.name.localeCompare(b.name);
      });

      const partyMembersData = [];

      for (const member of members) {
        if (!member) continue;

        const sys = member.system;

        partyMembersData.push({
          actor: member,
          actorUuid: member.uuid,
          beastformPortrait: getBeastformPortrait(member),
          hopeValue: sys.resources?.hope?.value ?? 0,
          hopeMax: sys.resources?.hope?.max ?? 0,
          hitPointsValue: sys.resources?.hitPoints?.value ?? 0,
          hitPointsMax: sys.resources?.hitPoints?.max ?? 0,
          stressValue: sys.resources?.stress?.value ?? 0,
          stressMax: sys.resources?.stress?.max ?? 0,
          armorValue: sys.armorScore?.value ?? 0,
          armorMax: sys.armorScore?.max ?? 0,
        });
      }

      const settings = game.settings.get(CONFIG.DH.id, CONFIG.DH.SETTINGS.gameSettings.Metagaming);
      const showStats =
        settings.hidePartyStats === "never" || (settings.hidePartyStats === "players" && game.user.isGM);

      return {
        document: actor,
        source: actor,
        actor,
        showStats,
        partyMembersData,
      };
    }

    // ─── LISTENERS ───────────────────────────────────────────────────────────

    static _attachListeners() {
      if (!this.element || !this.currentActor) return;

      const actor = this.currentActor;

      // Open party sheet
      this.element.querySelectorAll("[data-action='openSheet']").forEach((el) => {
        el.addEventListener("click", () => actor.sheet?.render(true));
      });

      // Portrait interaction (Navigate / Open Sheet)
      this.element.querySelectorAll("[data-action='openMemberSheet']").forEach((el) => {
        el.addEventListener("click", async () => {
          const uuid = el.closest("[data-actor-uuid]")?.dataset.actorUuid;
          if (!uuid) return;
          const member = await fromUuid(uuid);
          if (!member) return;
          const ownerLevel = game.user.isGM ? CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER : member.getUserLevel(game.user);
          if (ownerLevel < CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER) return;

          // Find a token for this actor on the current canvas
          const token = canvas.tokens?.placeables.find((t) => t.actor === member);

          if (token) {
            // Pan to and select the token
            token.control({ releaseOthers: true });
            canvas.animatePan({ x: token.x, y: token.y });
          } else {
            member.sheet?.render(true);
          }
        });
      });
    }
  }

  // ─── HOOKS ─────────────────────────────────────────────────────────────────

  Hooks.on("controlToken", PartyMiniSheet._onControlToken.bind(PartyMiniSheet));
  Hooks.on("updateActor", PartyMiniSheet._onUpdateActor.bind(PartyMiniSheet));

  Hooks.on("updateItem", (item) => {
    if (!item.parent) return;
    const isMemberItem = PartyMiniSheet.currentActor?.system.partyMembers?.some((m) => m === item.parent);
    if (isMemberItem) PartyMiniSheet._render();
  });

  Hooks.on("updateActiveEffect", (effect) => {
    const parentActor = effect.parent?.parent ?? effect.parent;
    if (!parentActor) return;
    const isMember = PartyMiniSheet.currentActor?.system.partyMembers?.some((m) => m === parentActor);
    if (isMember) queueMicrotask(() => PartyMiniSheet._render());
  });

  Hooks.on("renderSleekPartySheet", (app) => {
    if (app.actor === PartyMiniSheet.currentActor) PartyMiniSheet._teardown();
  });

  Hooks.on("closeSleekPartySheet", (app) => {
    const actor = PartyMiniSheet._resolveActor();
    if (actor && app.actor === actor) {
      PartyMiniSheet.currentActor = actor;
      PartyMiniSheet._render();
    }
  });
}
