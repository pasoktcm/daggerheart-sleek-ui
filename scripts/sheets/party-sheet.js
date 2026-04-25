import { FloatingTabs } from "../floating-tabs.js";

export function registerPartySheet() {
  if (game.system.id !== "daggerheart") return;

  const registeredSheets = CONFIG.Actor.sheetClasses.party || {};
  const daggerheartPartySheet = registeredSheets["daggerheart.Party"];
  if (!daggerheartPartySheet) {
    console.warn("daggerheart-sleek-ui | Could not find the system Party sheet to extend.");
    return;
  }

  const DaggerheartPartySheet = daggerheartPartySheet.cls;

  class SleekPartySheet extends DaggerheartPartySheet {
    tabs = {};
    floatingTabs = null;
    collapsedCategories = [];
    openCards = new Set();

    static DEFAULT_OPTIONS = foundry.utils.mergeObject(
      super.DEFAULT_OPTIONS,
      {
        classes: ["daggerheart", "sheet", "actor", "sleek-ui", "sleek-party"],
        window: { title: "TYPES.Actor.party", controls: [] },
        position: { width: 650, height: 700 },
        actions: {
          toggleCategory: SleekPartySheet._onToggleCategory,
          toggleHope: SleekPartySheet._onToggleMemberHope,
          toggleHitPoints: SleekPartySheet._onToggleMemberHitPoints,
          toggleStress: SleekPartySheet._onToggleMemberStress,
          toggleArmorSlot: SleekPartySheet._onToggleMemberArmorSlot,
          openMemberSheet: SleekPartySheet._onOpenMemberSheet,
          deletePartyMember: SleekPartySheet._onDeletePartyMember,
          deleteItem: SleekPartySheet._onDeleteItem,
          modifyResource: SleekPartySheet._onModifyMemberResource,
        },
        dragDrop: [
          {
            dragSelector: "[data-item-uuid]",
            dropSelector: null,
          },
        ],
      },
      { inplace: false },
    );

    static PARTS = {
      mainSheet: {
        template: "modules/daggerheart-sleek-ui/templates/sheets/party/party-sheet-main.hbs",
      },
    };

    async _prepareContext(options) {
      if (!options.isFirstRender && this.element) {
        const mainSheet = this.element.querySelector(".tab-content");
        if (mainSheet) this._savedScrollPosition = mainSheet.scrollTop;
      }

      const context = await super._prepareContext(options);

      context.partySize = this.document.system.partyMembers?.length ?? 0;

      context.tabsPosition = game.settings.get("daggerheart-sleek-ui", "tabsPosition");
      context.showTooltip = game.settings.get("daggerheart-sleek-ui", "showTooltip");

      if (Object.keys(this.tabs).length === 0) {
        this.tabs = {
          partyMembers: {
            id: "partyMembers",
            label: game.i18n.localize("DAGGERHEART.GENERAL.Tabs.partyMembers"),
            icon: "fa-solid fa-users",
            active: true,
          },
          inventory: {
            id: "inventory",
            label: game.i18n.localize("DAGGERHEART.GENERAL.Tabs.inventory"),
            icon: "fa-solid fa-backpack",
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
      context.partyMembersData = await this._preparePartyMembersData();
      await this._prepareInventoryData(context);

      if (options.isFirstRender && this.collapsedCategories.length === 0) {
        this.collapsedCategories = this.document.getFlag("daggerheart-sleek-ui", "collapsedCategories") || [];
      }
      context.collapsedCategories = this.collapsedCategories;

      const notesValue = foundry.utils.getProperty(this.document.system, "notes");
      context.notes = {
        field: this.document.system.schema.getField("notes"),
        value: notesValue,
        enriched: await foundry.applications.ux.TextEditor.implementation.enrichHTML(notesValue, {
          secrets: this.document.isOwner,
          relativeTo: this.document,
        }),
      };

      return context;
    }

    async _preparePartyMembersData() {
      const members = [...(this.document.system.partyMembers ?? [])].sort((a, b) => {
        const ownershipA = game.user.isGM ? CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER : a.getUserLevel(game.user);
        const ownershipB = game.user.isGM ? CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER : b.getUserLevel(game.user);
        if (ownershipB !== ownershipA) return ownershipB - ownershipA;
        return a.name.localeCompare(b.name);
      });
      const results = [];

      for (const actor of members) {
        if (!actor) continue;

        const sys = actor.system;

        const hope = {
          value: sys.resources?.hope?.value ?? 0,
          max: sys.resources?.hope?.max ?? 0,
        };

        const hitPoints = {
          value: sys.resources?.hitPoints?.value ?? 0,
          max: sys.resources?.hitPoints?.max ?? 0,
        };

        const stress = {
          value: sys.resources?.stress?.value ?? 0,
          max: sys.resources?.stress?.max ?? 0,
        };

        const armorItem = sys.armor ?? null;
        const armorSlots = {
          value: armorItem?.system?.marks?.value ?? 0,
          max: sys.armorScore ?? 0,
          itemUuid: armorItem?.uuid ?? null,
        };

        const evasion = sys.evasion ?? 0;
        const proficiency = sys.proficiency ?? "";
        const damageThresholds = {
          major: sys.damageThresholds?.major ?? 0,
          severe: sys.damageThresholds?.severe ?? 0,
        };

        const level = sys.levelData?.level?.changed ?? sys.levelData?.level?.value ?? 0;

        results.push({
          ownershipLevel: game.user.isGM ? CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER : actor.getUserLevel(game.user),
          actor,
          level,
          hope,
          hitPoints,
          stress,
          armorSlots,
          evasion,
          proficiency,
          damageThresholds,
          actorUuid: actor.uuid,
        });
      }

      return results;
    }

    async _prepareInventoryData(context) {
      const createBaseData = async (item) => {
        let hopeCost = 0;
        let usesData = null;

        if (item.system.actions) {
          for (const action of [...item.system.actions]) {
            if (action.cost) {
              for (const cost of action.cost) {
                if (cost.key === "hope") hopeCost = Math.max(hopeCost, cost.value);
              }
            }
            if (action.uses && action.uses.max && !usesData) {
              const max = parseInt(action.uses.max);
              usesData = { current: action.uses.value, max, remaining: max - action.uses.value, recovery: action.uses.recovery, actionId: action._id };
            }
          }
        }

        const enrichedDescription = await foundry.applications.ux.TextEditor.enrichHTML(item.system.description, { relativeTo: item });
        return { hopeCost, usesData, enrichedDescription };
      };

      const createWeaponData = async (item) => {
        const base = await createBaseData(item);
        const attack = item.system.attack;
        let damage = "";
        if (attack?.damage?.parts?.length) {
          damage = attack.damage.parts
            .map((part) => {
              const dice = part.value?.dice ? `${part.value.dice}` : "";
              const bonus = part.value?.bonus ? ` + ${part.value.bonus}` : "";
              const typeIcons = part.type ? [...part.type].map((t) => (t === "magical" ? '<i class="fa-solid fa-wand-sparkles"></i>' : '<i class="fa-solid fa-hand-fist"></i>')).join(" ") : "";
              return `${dice}${bonus}&nbsp;&nbsp;${typeIcons}`;
            })
            .join(", ");
        }
        const homebrewWeaponFeatures = game.settings.get(CONFIG.DH.id, CONFIG.DH.SETTINGS.gameSettings.Homebrew)?.itemFeatures?.weaponFeatures ?? {};
        const allWeaponFeatures = { ...CONFIG.DH.ITEM.weaponFeatures, ...homebrewWeaponFeatures };
        const homebrewWeaponKeys = new Set(Object.keys(homebrewWeaponFeatures));
        const features = (item.system.weaponFeatures || []).flatMap((wf) => {
          const config = allWeaponFeatures[wf.value];
          if (!config) return [];
          const isHomebrew = homebrewWeaponKeys.has(wf.value);
          return [
            {
              name: game.i18n.localize(config.label ?? config.name),
              description: isHomebrew ? (config.description ?? "") : game.i18n.localize(config.description),
            },
          ];
        });
        const tags = [
          { label: item.system.secondary ? game.i18n.localize("DAGGERHEART.ITEMS.Weapon.secondaryWeapon") : game.i18n.localize("DAGGERHEART.ITEMS.Weapon.primaryWeapon"), tagClass: "tag-green" },
          { label: attack?.roll?.trait ? attack.roll.trait.charAt(0).toUpperCase() + attack.roll.trait.slice(1) : "", tagClass: "tag-blue" },
          { label: game.i18n.localize(`DAGGERHEART.CONFIG.Range.${attack.range}.name`), tagClass: "tag-blue" },
          { label: game.i18n.localize(`DAGGERHEART.CONFIG.Burden.${item.system.burden}`), tagClass: "tag-blue" },
          { label: damage, tagClass: "tag-blue" },
        ].filter((tag) => tag.label);
        return { item, tags, features, damage, ...base };
      };

      const createArmorData = async (item) => {
        const base = await createBaseData(item);
        const homebrewArmorFeatures = game.settings.get(CONFIG.DH.id, CONFIG.DH.SETTINGS.gameSettings.Homebrew)?.itemFeatures?.armorFeatures ?? {};
        const allArmorFeatures = { ...CONFIG.DH.ITEM.armorFeatures, ...homebrewArmorFeatures };
        const homebrewArmorKeys = new Set(Object.keys(homebrewArmorFeatures));
        const features = (item.system.armorFeatures || []).flatMap((af) => {
          const config = allArmorFeatures[af.value];
          if (!config) return [];
          const isHomebrew = homebrewArmorKeys.has(af.value);
          return [
            {
              name: game.i18n.localize(config.label ?? config.name),
              description: isHomebrew ? (config.description ?? "") : game.i18n.localize(config.description),
            },
          ];
        });
        const tags = [
          { label: `${game.i18n.localize("DAGGERHEART.ITEMS.Armor.baseScore")}: ${item.system.baseScore}`, tagClass: "tag-blue" },
          { label: `${game.i18n.localize("DAGGERHEART.ITEMS.Armor.baseThresholds.base")}: ${item.system.baseThresholds.major} / ${item.system.baseThresholds.severe}`, tagClass: "tag-blue" },
        ];
        return { item, tags, marks: item.system.marks, features, ...base };
      };

      const createConsumableData = async (item) => {
        const base = await createBaseData(item);
        return { item, tags: [], quantity: item.system.quantity, ...base };
      };

      const createLootData = async (item) => {
        const base = await createBaseData(item);
        return { item, tags: [], quantity: item.system.quantity, ...base };
      };

      const actor = this.document;
      const weapons = actor.items.filter((i) => i.type === "weapon").sort((a, b) => a.sort - b.sort);
      const armors = actor.items.filter((i) => i.type === "armor").sort((a, b) => a.sort - b.sort);
      const consumables = actor.items.filter((i) => i.type === "consumable").sort((a, b) => a.sort - b.sort);
      const loots = actor.items.filter((i) => i.type === "loot").sort((a, b) => a.sort - b.sort);

      context.weapons = await Promise.all(weapons.map((item) => createWeaponData(item)));
      context.armors = await Promise.all(armors.map((item) => createArmorData(item)));
      context.consumables = await Promise.all(consumables.map((item) => createConsumableData(item)));
      context.loots = await Promise.all(loots.map((item) => createLootData(item)));
    }

    static async _onToggleCategory(event, target) {
      const wrapper = target.closest(".category-wrapper");
      if (!wrapper) return;

      wrapper.classList.toggle("collapsed");

      const categoryId = wrapper.dataset.categoryId;
      if (!categoryId) return;

      const isCollapsed = wrapper.classList.contains("collapsed");

      if (isCollapsed) {
        if (!this.collapsedCategories.includes(categoryId)) this.collapsedCategories.push(categoryId);
      } else {
        const index = this.collapsedCategories.indexOf(categoryId);
        if (index > -1) this.collapsedCategories.splice(index, 1);
      }

      this.document.setFlag("daggerheart-sleek-ui", "collapsedCategories", [...this.collapsedCategories]);
    }

    static async _onModifyMemberResource(event, target) {
      event.preventDefault();
      const uuid = target.dataset.actorUuid;
      const resource = target.dataset.resource;
      let amount = parseInt(target.dataset.amount);

      if (event.type === "contextmenu") amount = -amount;
      if (!uuid || !resource) return;

      if (resource === "armorSlots") {
        const actor = await fromUuid(uuid);
        if (!actor) return;
        const armorItem = actor.system.armor;
        if (!armorItem) return;
        const current = armorItem.system.marks.value;
        const max = actor.system.armorScore;
        const newValue = Math.max(0, Math.min(max, current + amount));
        await armorItem.update({ "system.marks.value": newValue });
        return;
      }

      const actor = await fromUuid(uuid);
      if (!actor) return;

      const fullPath = `system.resources.${resource}`;
      const maxPath = fullPath.replace(".value", ".max");
      const currentValue = foundry.utils.getProperty(actor, fullPath);
      const maxValue = foundry.utils.getProperty(actor, maxPath);
      const newValue = Math.max(0, Math.min(maxValue, currentValue + amount));

      await actor.update({ [fullPath]: newValue });
    }

    _onRender(context, options) {
      this.element.id = "sleek-ui-sheet";

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

      if (this._savedScrollPosition !== undefined) {
        const mainSheet = this.element.querySelector(".tab-content");
        if (mainSheet) mainSheet.scrollTop = this._savedScrollPosition;
      }
    }

    _restoreCardStates() {
      const mainSheet = this.element.querySelector(".tab-content");
      if (!mainSheet) return;

      this.openCards.forEach((uuid) => {
        const actorHeader = mainSheet.querySelector(`.card-container.header[data-actor-uuid="${uuid}"]`);
        if (actorHeader) {
          const description = actorHeader.closest(".card-wrapper")?.querySelector(".card-container.description");
          if (description) description.style.display = "flex";
        }

        const itemHeader = mainSheet.querySelector(`.card-container.header[data-item-uuid="${uuid}"]`);
        if (itemHeader) {
          const description = itemHeader.closest(".card-wrapper")?.querySelector(".card-container.description");
          if (description) description.style.display = "flex";
        }
      });
    }

    _attachPartListeners(partId, htmlElement, options) {
      super._attachPartListeners?.(partId, htmlElement, options);
      this._attachBasicTabListeners(htmlElement);
      this._attachCardListeners(htmlElement);
      this._attachMemberPipListeners(htmlElement);
      this._attachResourceHeaderListeners(htmlElement);
      this._attachUsesListeners(htmlElement);
      this._attachSimpleResourceListeners(htmlElement);
      this._attachDieResourceListeners(htmlElement);
      this._attachDiceResourceListeners(htmlElement);
      this._attachQuantityListeners(htmlElement);
    }

    _attachBasicTabListeners(htmlElement) {
      htmlElement.querySelectorAll(".basic-tabs .tab-button").forEach((btn) => {
        btn.addEventListener("click", async (event) => {
          event.preventDefault();
          const tabId = btn.dataset.tab;

          Object.keys(this.tabs).forEach((key) => {
            this.tabs[key].active = key === tabId;
          });

          await this.render(false, { parts: ["mainSheet"] });
        });
      });
    }

    _attachCardListeners(htmlElement) {
      htmlElement.querySelectorAll(".card-text, .card-resource").forEach((nameContainer) => {
        nameContainer.addEventListener("click", (event) => {
          if (event.target.closest('.card-controls, [data-action="useItem"], .uses-resource, .simple-resource, .die-resource, .dice-resource, .recall-resource, .roll-damage, .quantity-resource, .resource-pip')) return;
          const cardWrapper = nameContainer.closest(".card-wrapper");
          if (!cardWrapper) return;
          const description = cardWrapper.querySelector(".card-container.description");
          if (!description) return;

          const isCurrentlyHidden = description.style.display === "none" || !description.style.display;
          description.style.display = isCurrentlyHidden ? "flex" : "none";

          const actorUuid = cardWrapper.querySelector("[data-actor-uuid]")?.dataset.actorUuid;
          const itemUuid = cardWrapper.dataset.itemUuid;
          const key = actorUuid || itemUuid;
          if (key) {
            if (isCurrentlyHidden) {
              this.openCards.add(key);
            } else {
              this.openCards.delete(key);
            }
          }
        });
      });
    }

    _attachMemberPipListeners(htmlElement) {
      const pipConfigs = [
        { action: "toggleHope", getPath: () => "system.resources.hope" },
        { action: "toggleHitPoints", getPath: () => "system.resources.hitPoints" },
        { action: "toggleStress", getPath: () => "system.resources.stress" },
      ];

      pipConfigs.forEach(({ action, getPath }) => {
        htmlElement.querySelectorAll(`[data-action="${action}"]`).forEach((pip) => {
          pip.addEventListener(
            "contextmenu",
            async (event) => {
              event.preventDefault();
              event.stopImmediatePropagation();
              const uuid = pip.dataset.actorUuid;
              const pipValue = parseInt(pip.dataset.value);
              if (!uuid || isNaN(pipValue)) return;
              const actor = await fromUuid(uuid);
              if (!actor) return;
              await actor.update({ [`${getPath()}.value`]: Math.max(0, pipValue - 1) });
            },
            true,
          );
        });
      });

      htmlElement.querySelectorAll('[data-action="toggleArmorSlot"]').forEach((pip) => {
        pip.addEventListener(
          "contextmenu",
          async (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            const itemUuid = pip.dataset.itemUuid;
            const pipValue = parseInt(pip.dataset.value);
            if (!itemUuid || isNaN(pipValue)) return;
            const armorItem = await fromUuid(itemUuid);
            if (!armorItem) return;
            await armorItem.update({ "system.marks.value": Math.max(0, pipValue - 1) });
          },
          true,
        );
      });
    }

    _attachResourceHeaderListeners(htmlElement) {
      htmlElement.querySelectorAll('[data-action="modifyResource"]').forEach((element) => {
        element.addEventListener(
          "contextmenu",
          async (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            const uuid = element.dataset.actorUuid;
            const resource = element.dataset.resource;
            const amount = parseInt(element.dataset.amount);
            if (!uuid || !resource || isNaN(amount)) return;
            const actor = await fromUuid(uuid);
            if (!actor) return;

            if (resource === "armorSlots") {
              const armorItem = actor.system.armor;
              if (!armorItem) return;
              const current = armorItem.system.marks.value;
              await armorItem.update({ "system.marks.value": Math.max(0, current - amount) });
              return;
            }

            const fullPath = `system.resources.${resource}`;
            const currentValue = foundry.utils.getProperty(actor, fullPath);
            const newValue = Math.max(0, currentValue - amount);
            await actor.update({ [fullPath]: newValue });
          },
          true,
        );
      });

      htmlElement.querySelectorAll('[data-action="toggleArmorSlot"].resource-header, .resource-header[data-action="toggleArmorSlot"]').forEach((element) => {
        element.addEventListener(
          "contextmenu",
          async (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            const itemUuid = element.dataset.itemUuid;
            if (!itemUuid) return;
            const armorItem = await fromUuid(itemUuid);
            if (!armorItem) return;
            const current = armorItem.system.marks.value;
            await armorItem.update({ "system.marks.value": Math.max(0, current - 1) });
          },
          true,
        );
      });
    }

    _attachUsesListeners(htmlElement) {
      htmlElement.querySelectorAll(".uses-resource").forEach((element) => {
        element.addEventListener("click", async (event) => {
          const itemUuid = element.closest("[data-item-uuid]")?.dataset.itemUuid;
          const actionId = element.dataset.actionId;
          if (!itemUuid || !actionId) return;
          const item = await fromUuid(itemUuid);
          if (!item) return;
          const action = item.system.actions?.get(actionId);
          if (!action || !action.uses) return;
          await action.update({ "uses.value": Math.max(0, action.uses.value - 1) });
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
            await action.update({ "uses.value": Math.min(action.uses.max, action.uses.value + 1) });
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
          await item.update({ "system.resource.value": Math.min(maxValue, currentValue + 1) });
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
            await item.update({ "system.resource.value": Math.max(0, currentValue - 1) });
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
          const dieFaces = parseInt(element.dataset.dieFaces.replace("d", "")) || 6;
          const currentValue = item.system.resource.value || 0;
          await item.update({ "system.resource.value": (currentValue + 1) % (dieFaces + 1) });
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
            await item.update({ "system.resource.value": Math.max(0, currentValue - 1) });
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
            const itemUuid = diceValue.closest("[data-item-uuid]")?.dataset.itemUuid;
            const item = await fromUuid(itemUuid);
            const diceIndex = diceValue.dataset.dice;
            const currentState = item.system.resource.diceStates[diceIndex];
            if (!currentState) return;
            await item.update({ [`system.resource.diceStates.${diceIndex}.used`]: !currentState.used });
          });
        });
      });
    }

    _attachQuantityListeners(htmlElement) {
      htmlElement.querySelectorAll(".quantity-resource").forEach((element) => {
        element.addEventListener("click", async (event) => {
          event.preventDefault();
          const itemUuid = element.dataset.itemUuid;
          const item = await fromUuid(itemUuid);
          const amount = event.shiftKey ? 10 : 1;
          await item.update({ "system.quantity": item.system.quantity + amount });
        });

        element.addEventListener(
          "contextmenu",
          async (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            const itemUuid = element.dataset.itemUuid;
            const item = await fromUuid(itemUuid);
            const amount = event.shiftKey ? 10 : 1;
            await item.update({ "system.quantity": Math.max(0, item.system.quantity - amount) });
          },
          true,
        );
      });
    }

    _onDragStart(event) {
      const card = event.target.closest("[data-item-uuid]");
      if (!card) return;

      const itemUuid = card.dataset.itemUuid;
      const item = fromUuidSync(itemUuid);
      if (!item) return;

      if (item.parent === this.document) {
        SleekPartySheet.draggedItem = {
          itemId: item.id,
          actorId: this.document.id,
          itemName: item.name,
        };
      }

      const dragData = { type: "Item", uuid: item.uuid };
      if (item.parent) {
        dragData.actorId = item.parent.id;
        dragData.data = item.toObject();
      }

      event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }

    async _onDrop(event) {
      const data = foundry.applications.ux.TextEditor.getDragEventData(event);

      if (!data || data.type !== "Item") {
        return super._onDrop?.(event);
      }

      const item = await fromUuid(data.uuid);
      if (!item) return;

      // Item dragged from a character sheet onto the party sheet — transfer it.
      if (item.parent && item.parent.type === "character") {
        event.preventDefault();
        event.stopPropagation();

        const sourceActor = item.parent;
        const itemData = item.toObject();
        const createdItems = await this.document.createEmbeddedDocuments("Item", [itemData]);

        if (createdItems && createdItems.length > 0) {
          await sourceActor.deleteEmbeddedDocuments("Item", [item.id]);
          ui.notifications.info(`Transferred ${item.name} to ${this.document.name}`);
        }

        return false;
      }

      // Item dragged within the party sheet — reorder.
      if (item.parent === this.document) {
        event.preventDefault();
        event.stopPropagation();

        const dropTarget = event.target.closest(".card-wrapper");
        if (!dropTarget) return;

        const targetUuid = dropTarget.dataset.itemUuid;
        const targetItem = await fromUuid(targetUuid);
        if (!targetItem || targetItem === item) return;
        if (item.type !== targetItem.type) return;

        const siblings = this.document.items.filter((i) => i.type === item.type).sort((a, b) => a.sort - b.sort);

        const draggedIndex = siblings.indexOf(item);
        const targetIndex = siblings.indexOf(targetItem);

        siblings.splice(draggedIndex, 1);
        siblings.splice(targetIndex, 0, item);

        const updateData = siblings.map((sibling, index) => ({
          _id: sibling.id,
          sort: (index + 1) * 100000,
        }));

        await this.document.updateEmbeddedDocuments("Item", updateData);
        return false;
      }

      return super._onDrop?.(event);
    }

    async _onDropActor(event, document) {
      const ALLOWED = ["character", "companion", "adversary"];

      if (document && ALLOWED.includes(document.type)) {
        const currentUuids = this.document.system.partyMembers.map((x) => x.uuid);
        if (currentUuids.includes(document.uuid)) {
          return ui.notifications.warn(game.i18n.localize("DAGGERHEART.UI.Notifications.duplicateCharacter"));
        }
        await this.document.update({
          "system.partyMembers": [...currentUuids, document.uuid],
        });
      } else {
        ui.notifications.warn(game.i18n.localize("DAGGERHEART.UI.Notifications.onlyCharactersInPartySheet"));
      }

      return null;
    }

    static async _onOpenMemberSheet(event, target) {
      const uuid = target.dataset.actorUuid;
      if (!uuid) return;
      const actor = await fromUuid(uuid);
      actor?.sheet?.render(true);
    }

    static async _onDeletePartyMember(event, target) {
      const uuid = target.dataset.actorUuid;
      if (!uuid) return;

      if (!event.shiftKey) {
        const actor = await fromUuid(uuid);
        const confirmed = await foundry.applications.api.DialogV2.confirm({
          window: { title: `Remove ${actor?.name ?? "member"} from party?` },
          content: `<p>Remove <strong>${actor?.name ?? "this member"}</strong> from the party sheet?</p>`,
        });
        if (!confirmed) return;
      }

      const currentUuids = this.document.system.partyMembers.map((x) => x.uuid);
      await this.document.update({
        "system.partyMembers": currentUuids.filter((u) => u !== uuid),
      });
    }

    static async _onDeleteItem(event, target) {
      const uuid = target.dataset.itemUuid;
      if (!uuid) return;

      const item = await fromUuid(uuid);
      if (!item) return;

      if (!event.shiftKey) {
        const confirmed = await foundry.applications.api.DialogV2.confirm({
          window: { title: game.i18n.format("DAGGERHEART.APPLICATIONS.DeleteConfirmation.title", { type: game.i18n.localize(`TYPES.Item.${item.type}`), name: item.name }) },
          content: game.i18n.format("DAGGERHEART.APPLICATIONS.DeleteConfirmation.text", { name: item.name }),
        });
        if (!confirmed) return;
      }

      await item.delete();
    }

    static async _onToggleMemberHope(event, target) {
      const uuid = target.dataset.actorUuid;
      const pipValue = parseInt(target.dataset.value);
      if (!uuid || isNaN(pipValue)) return;

      const actor = await fromUuid(uuid);
      if (!actor) return;

      const current = actor.system.resources.hope.value;
      const newValue = pipValue === current ? current - 1 : pipValue;
      await actor.update({ "system.resources.hope.value": Math.max(0, newValue) });
    }

    static async _onToggleMemberHitPoints(event, target) {
      const uuid = target.dataset.actorUuid;
      const pipValue = parseInt(target.dataset.value);
      if (!uuid || isNaN(pipValue)) return;

      const actor = await fromUuid(uuid);
      if (!actor) return;

      const current = actor.system.resources.hitPoints.value;
      const newValue = pipValue === current ? current - 1 : pipValue;
      await actor.update({ "system.resources.hitPoints.value": Math.max(0, newValue) });
    }

    static async _onToggleMemberStress(event, target) {
      const uuid = target.dataset.actorUuid;
      const pipValue = parseInt(target.dataset.value);
      if (!uuid || isNaN(pipValue)) return;

      const actor = await fromUuid(uuid);
      if (!actor) return;

      const current = actor.system.resources.stress.value;
      const newValue = pipValue === current ? current - 1 : pipValue;
      await actor.update({ "system.resources.stress.value": Math.max(0, newValue) });
    }

    static async _onToggleMemberArmorSlot(event, target) {
      const itemUuid = target.dataset.itemUuid;
      const pipValue = parseInt(target.dataset.value);
      if (!itemUuid || isNaN(pipValue)) return;

      const armorItem = await fromUuid(itemUuid);
      if (!armorItem) return;

      const current = armorItem.system.marks.value;
      const newValue = pipValue === current ? current - 1 : pipValue;
      await armorItem.update({ "system.marks.value": Math.max(0, newValue) });
    }

    async close(options = {}) {
      if (this.floatingTabs) {
        this.floatingTabs.close();
        this.floatingTabs = null;
      }
      return super.close(options);
    }
  }

  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, "daggerheart", SleekPartySheet, {
    types: ["party"],
    makeDefault: true,
    label: "DH Sleek UI",
  });

  SleekPartySheet.draggedItem = null;

  Hooks.on("preCreateItem", async (item, data, options, userId) => {
    if (!SleekPartySheet.draggedItem) return;
    if (userId !== game.user.id) return;

    const dragData = SleekPartySheet.draggedItem;

    if (item.parent?.type === "character" && item.parent?.id !== dragData.actorId) {
      setTimeout(async () => {
        const sourceActor = game.actors.get(dragData.actorId);
        if (sourceActor) {
          const sourceItem = sourceActor.items.get(dragData.itemId);
          if (sourceItem) {
            await sourceActor.deleteEmbeddedDocuments("Item", [dragData.itemId]);
            ui.notifications.info(`Transferred ${dragData.itemName} from ${sourceActor.name}`);
          }
        }
        SleekPartySheet.draggedItem = null;
      }, 50);
    }
  });

  document.addEventListener("dragend", () => {
    SleekPartySheet.draggedItem = null;
  });

  Hooks.on("updateActor", (actor) => {
    for (const app of Object.values(ui.windows)) {
      if (!(app instanceof SleekPartySheet)) continue;
      const isMember = app.document.system.partyMembers?.some((m) => m?.id === actor.id);
      if (isMember) app.render(false);
    }
  });

  Hooks.on("updateItem", (item) => {
    if (!item.parent) return;
    const changedActorId = item.parent.id;

    for (const app of Object.values(ui.windows)) {
      if (!(app instanceof SleekPartySheet)) continue;
      const isMember = app.document.system.partyMembers?.some((m) => m?.id === changedActorId);
      if (isMember) app.render(false);
    }
  });
}
