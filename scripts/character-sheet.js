import { FloatingTabs } from "./floating-tabs.js";

export function registerCharacterSheet() {
  if (game.system.id !== "daggerheart") return;

  const registeredSheets = CONFIG.Actor.sheetClasses.character || {};
  const daggerheartSheet = registeredSheets["daggerheart.CharacterSheet"];
  if (!daggerheartSheet) return;

  const DaggerheartCharacterSheet = daggerheartSheet.cls;

  class SleekCharacterSheet extends DaggerheartCharacterSheet {
    tabs = {};
    floatingTabs = null;
    collapsedCategories = [];
    openCards = new Set();
    hoveredCompactCard = null;

    static draggedItem = null;

    static DEFAULT_OPTIONS = foundry.utils.mergeObject(
      super.DEFAULT_OPTIONS,
      {
        classes: ["daggerheart", "sheet", "actor", "sleek-ui"],
        window: { title: "ACTOR.TypeCharacter", controls: [] },
        position: { width: 860, height: 900 },
        actions: {
          toggleHope: this._onToggleHope,
          modifyResource: this._onModifyResource,
          toggleResource: this._onToggleResource,
          toggleCategory: this._onToggleCategory,
          useAction: this._onUseAction,
          navigateToCard: this._onNavigateToCard,
          addToQuickAccess: this._onAddToQuickAccess,
          removeFromQuickAccess: this._onRemoveFromQuickAccess,
          addQuickAccessDivider: this._onAddQuickAccessDivider,
          cancelBeastform: SleekCharacterSheet._onCancelBeastform,
        },
        dragDrop: [
          {
            dragSelector: "[data-item-uuid]",
            dropSelector: ".card-wrapper, .favorites-list",
          },
        ],
      },
      { inplace: false },
    );

    static PARTS = {
      sidebar: {
        template:
          "modules/daggerheart-sleek-ui/templates/characters/sheet-sidebar.hbs",
      },
      mainSheet: {
        template:
          "modules/daggerheart-sleek-ui/templates/characters/sheet-main.hbs",
      },
    };

    async _prepareContext(options) {
      if (!options.isFirstRender && this.element) {
        const mainSheet = this.element.querySelector(".tab-content");
        if (mainSheet) {
          this._savedScrollPosition = mainSheet.scrollTop;
        }

        const sidebar = this.element.querySelector(".favorites");
        if (sidebar) {
          this._savedSidebarScrollPosition = sidebar.scrollTop;
        }
      }

      const context = await super._prepareContext(options);

      context.currencyLabel = game.settings.get(
        "daggerheart-sleek-ui",
        "currencyLabel",
      );
      context.quickAccess = game.settings.get(
        "daggerheart-sleek-ui",
        "quickAccess",
      );
      context.tabsPosition = game.settings.get(
        "daggerheart-sleek-ui",
        "tabsPosition",
      );

      if (Object.keys(this.tabs).length === 0) {
        this.tabs = {
          features: {
            id: "features",
            label: game.i18n.localize("DAGGERHEART.GENERAL.Tabs.features"),
            icon: "fa-solid fa-list-ul",
            active: true,
          },
          loadout: {
            id: "loadout",
            label: game.i18n.localize("DAGGERHEART.GENERAL.Tabs.loadout"),
            icon: "fa-solid fa-book",
            active: false,
          },
          inventory: {
            id: "inventory",
            label: game.i18n.localize("DAGGERHEART.GENERAL.Tabs.inventory"),
            icon: "fa-solid fa-backpack",
            active: false,
          },
          biography: {
            id: "biography",
            label: game.i18n.localize("DAGGERHEART.GENERAL.Tabs.biography"),
            icon: "fa-solid fa-feather-pointed",
            active: false,
          },
          effects: {
            id: "effects",
            label: game.i18n.localize("DAGGERHEART.GENERAL.Tabs.effects"),
            icon: "fa-solid fa-sparkles",
            active: false,
          },
        };
      }

      if (options.isFirstRender && this.collapsedCategories.length === 0) {
        this.collapsedCategories =
          this.actor.getFlag("daggerheart-sleek-ui", "collapsedCategories") ||
          [];
      }

      context.tabs = this.tabs;
      context.collapsedCategories = this.collapsedCategories;
      context.beastformActive = this.actor.effects.find(
        (x) => x.type === "beastform",
      );
      if (context.beastformActive) {
        context.beastformItem = this.actor.items.find(
          (i) =>
            i.type === "feature" &&
            i.system.actions?.some((a) => a.type === "beastform"),
        );
      }
      if (context.beastformActive) {
        const useBeastformPortrait = game.settings.get(
          "daggerheart-sleek-ui",
          "beastformPortrait",
        );

        if (useBeastformPortrait) {
          const portrait = this.actor.prototypeToken.ring.subject.texture;

          if (portrait) {
            context.beastformPortrait = portrait;
          }
        }
      }

      await this._prepareFeaturesData(context);
      await this._prepareLoadoutData(context);
      await this._prepareInventoryData(context);
      await this._prepareEffectsData(context);
      await this._prepareBiographyData(context);
      await this._prepareQuickAccessData(context);

      return context;
    }

    async _prepareFeaturesData(context) {
      const ancestry = this.actor.items.find((i) => i.type === "ancestry");
      const community = this.actor.items.find((i) => i.type === "community");
      const classItem = this.actor.items.find(
        (i) => i.type === "class" && !i.system.isMulticlass,
      );
      const subclass = this.actor.items.find(
        (i) => i.type === "subclass" && !i.system.isMulticlass,
      );
      const multiclassItem = this.actor.items.find(
        (i) => i.type === "class" && i.system.isMulticlass,
      );
      const multiclassSubclass = this.actor.items.find(
        (i) => i.type === "subclass" && i.system.isMulticlass,
      );

      const sheetLists = this.actor.system.sheetLists;
      const ancestryFeatures = sheetLists?.ancestryFeatures?.values || [];
      const communityFeatures = sheetLists?.communityFeatures?.values || [];
      const allClassFeatures = sheetLists?.classFeatures?.values || [];
      const allSubclassFeatures = sheetLists?.subclassFeatures?.values || [];
      const extraFeatures = sheetLists?.features?.values || [];

      const classFeatures = allClassFeatures.filter(
        (f) => !f.system.multiclassOrigin,
      );
      const multiclassClassFeatures = allClassFeatures.filter(
        (f) => f.system.multiclassOrigin,
      );
      const subclassFeatures = allSubclassFeatures.filter(
        (f) => !f.system.multiclassOrigin,
      );
      const multiclassSubclassFeatures = allSubclassFeatures.filter(
        (f) => f.system.multiclassOrigin,
      );

      const createFeatureData = async (item, tags) => {
        let hopeCost = 0;
        let usesData = null;

        if (item.system.actions) {
          for (const action of item.system.actions) {
            if (action.cost) {
              for (const cost of action.cost) {
                if (cost.key === "hope") {
                  hopeCost = Math.max(hopeCost, cost.value);
                }
              }
            }

            if (action.uses && action.uses.max && !usesData) {
              const max = parseInt(action.uses.max);
              usesData = {
                current: action.uses.value,
                max: max,
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

        return { item, tags, hopeCost, usesData, enrichedDescription };
      };

      const createTag = (label, uuid, tagClass) => ({ label, uuid, tagClass });

      const heritagePromises = [];

      if (ancestryFeatures[0]) {
        heritagePromises.push(
          createFeatureData(ancestryFeatures[0], [
            createTag(
              `Ancestry — ${ancestry?.name || "Unknown"}`,
              ancestry?.uuid || "",
              "tag-purple",
            ),
          ]),
        );
      }

      if (ancestryFeatures[1]) {
        heritagePromises.push(
          createFeatureData(ancestryFeatures[1], [
            createTag(
              `Ancestry — ${ancestry?.name || "Unknown"}`,
              ancestry?.uuid || "",
              "tag-purple",
            ),
          ]),
        );
      }

      if (communityFeatures[0]) {
        heritagePromises.push(
          createFeatureData(communityFeatures[0], [
            createTag(
              `Community — ${community?.name || "Unknown"}`,
              community?.uuid || "",
              "tag-orange",
            ),
          ]),
        );
      }

      context.heritageFeatures = await Promise.all(heritagePromises);

      context.classFeatures = await Promise.all([
        ...classFeatures.map((feature) =>
          createFeatureData(feature, [
            createTag(
              `Class — ${classItem?.name || "Unknown"}`,
              classItem?.uuid || "",
              "tag-green",
            ),
          ]),
        ),
        ...subclassFeatures.map((feature) =>
          createFeatureData(feature, [
            createTag(
              `Subclass — ${subclass?.name || "Unknown"}`,
              subclass?.uuid || "",
              "tag-green",
            ),
          ]),
        ),
      ]);

      context.multiclassFeatures = await Promise.all([
        ...multiclassClassFeatures.map((feature) =>
          createFeatureData(feature, [
            createTag(
              `Multiclass — ${multiclassItem?.name || "Unknown"}`,
              multiclassItem?.uuid || "",
              "tag-blue",
            ),
          ]),
        ),
        ...multiclassSubclassFeatures.map((feature) =>
          createFeatureData(feature, [
            createTag(
              `Multiclass Subclass — ${multiclassSubclass?.name || "Unknown"}`,
              multiclassSubclass?.uuid || "",
              "tag-blue",
            ),
          ]),
        ),
      ]);

      context.extraFeatures = await Promise.all(
        extraFeatures.map((feature) => createFeatureData(feature)),
      );
    }

    async _prepareLoadoutData(context) {
      const domainCards = this.actor.system.domainCards;

      const createDomainData = async (item) => {
        let hopeCost = 0;
        let usesData = null;

        if (item.system.actions) {
          for (const action of item.system.actions) {
            if (action.cost) {
              for (const cost of action.cost) {
                if (cost.key === "hope") {
                  hopeCost = Math.max(hopeCost, cost.value);
                }
              }
            }

            if (action.uses && action.uses.max && !usesData) {
              const max = parseInt(action.uses.max);
              usesData = {
                current: action.uses.value,
                max: max,
                remaining: max - action.uses.value,
                recovery: action.uses.recovery,
                actionId: action._id,
              };
            }
          }
        }

        const tags = [
          {
            label:
              item.system.type.charAt(0).toUpperCase() +
              item.system.type.slice(1),
            tagClass: "tag-orange",
          },
          {
            label:
              item.system.domain.charAt(0).toUpperCase() +
              item.system.domain.slice(1),
            tagClass: "tag-orange",
          },
          {
            label: `${game.i18n.localize("DAGGERHEART.GENERAL.level")} ${item.system.level}`,
            tagClass: "tag-orange",
          },
          {
            label: `${game.i18n.localize("DAGGERHEART.ITEMS.DomainCard.recallCost")}: ${item.system.recallCost}`,
            tagClass: "tag-orange",
          },
        ];

        const enrichedDescription =
          await foundry.applications.ux.TextEditor.enrichHTML(
            item.system.description,
            { relativeTo: item },
          );

        return { item, tags, hopeCost, usesData, enrichedDescription };
      };

      const sortedLoadout = (domainCards?.loadout || []).sort(
        (a, b) => a.sort - b.sort,
      );
      const sortedVault = (domainCards?.vault || []).sort(
        (a, b) => a.sort - b.sort,
      );

      context.loadoutCards = await Promise.all(
        sortedLoadout.map((item) => createDomainData(item)),
      );
      context.vaultCards = await Promise.all(
        sortedVault.map((item) => createDomainData(item)),
      );
    }

    async _prepareInventoryData(context) {
      const createBaseData = async (item) => {
        let hopeCost = 0;
        let usesData = null;

        if (item.system.actions) {
          for (const action of [...item.system.actions]) {
            if (action.cost) {
              for (const cost of action.cost) {
                if (cost.key === "hope") {
                  hopeCost = Math.max(hopeCost, cost.value);
                }
              }
            }

            if (action.uses && action.uses.max && !usesData) {
              const max = parseInt(action.uses.max);
              usesData = {
                current: action.uses.value,
                max: max,
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
            { relativeTo: item },
          );

        return { hopeCost, usesData, enrichedDescription };
      };

      const createWeaponData = async (item, proficiency) => {
        const base = await createBaseData(item);
        const attack = item.system.attack;

        let damage = "";
        if (attack?.damage?.parts?.length) {
          damage = attack.damage.parts
            .map((part) => {
              const dice = part.value?.dice
                ? `${proficiency}${part.value.dice}`
                : "";
              const bonus = part.value?.bonus ? ` + ${part.value.bonus}` : "";
              const typeIcons = part.type
                ? [...part.type]
                    .map((t) =>
                      t === "magical"
                        ? '<i class="fa-solid fa-wand-sparkles"></i>'
                        : '<i class="fa-solid fa-hand-fist"></i>',
                    )
                    .join(" ")
                : "";
              return `${dice}${bonus}&nbsp;&nbsp;${typeIcons}`;
            })
            .join(", ");
        }

        const features = (item.system.weaponFeatures || []).map((wf) => {
          const config = CONFIG.DH.ITEM.weaponFeatures[wf.value];
          return {
            name: game.i18n.localize(config.label),
            description: game.i18n.localize(config.description),
          };
        });

        const tags = [
          {
            label: item.system.secondary
              ? game.i18n.localize("DAGGERHEART.ITEMS.Weapon.secondaryWeapon")
              : game.i18n.localize("DAGGERHEART.ITEMS.Weapon.primaryWeapon"),
            tagClass: "tag-green",
          },
          {
            label: attack?.roll?.trait
              ? attack.roll.trait.charAt(0).toUpperCase() +
                attack.roll.trait.slice(1)
              : "",
            tagClass: "tag-blue",
          },
          {
            label: game.i18n.localize(
              `DAGGERHEART.CONFIG.Range.${attack.range}.name`,
            ),
            tagClass: "tag-blue",
          },
          {
            label: game.i18n.localize(
              `DAGGERHEART.CONFIG.Burden.${item.system.burden}`,
            ),
            tagClass: "tag-blue",
          },
          {
            label: damage,
            tagClass: "tag-blue",
          },
        ].filter((tag) => tag.label);

        return { item, tags, features, damage, ...base };
      };

      const createArmorData = async (item) => {
        const base = await createBaseData(item);

        const features = (item.system.armorFeatures || []).map((af) => {
          const config = CONFIG.DH.ITEM.armorFeatures[af.value];
          return {
            name: game.i18n.localize(config.label),
            description: game.i18n.localize(config.description),
          };
        });

        const tags = [
          {
            label: `${game.i18n.localize("DAGGERHEART.ITEMS.Armor.baseScore")}: ${item.system.baseScore}`,
            tagClass: "tag-blue",
          },
          {
            label: `${game.i18n.localize("DAGGERHEART.ITEMS.Armor.baseThresholds.base")}: ${item.system.baseThresholds.major} / ${item.system.baseThresholds.severe}`,
            tagClass: "tag-blue",
          },
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

      const weapons = this.actor.items
        .filter((i) => i.type === "weapon")
        .sort((a, b) => a.sort - b.sort);
      const armors = this.actor.items
        .filter((i) => i.type === "armor")
        .sort((a, b) => a.sort - b.sort);
      const consumables = this.actor.items
        .filter((i) => i.type === "consumable")
        .sort((a, b) => a.sort - b.sort);
      const loots = this.actor.items
        .filter((i) => i.type === "loot")
        .sort((a, b) => a.sort - b.sort);

      context.weapons = await Promise.all(
        weapons.map((item) =>
          createWeaponData(item, this.actor.system.proficiency),
        ),
      );
      context.armors = await Promise.all(
        armors.map((item) => createArmorData(item)),
      );
      context.consumables = await Promise.all(
        consumables.map((item) => createConsumableData(item)),
      );
      context.loots = await Promise.all(
        loots.map((item) => createLootData(item)),
      );

      if (this.actor.system.usedUnarmed) {
        const unarmed = this.actor.system.usedUnarmed;
        const proficiency = this.actor.system.proficiency;
        let unarmedDamage = "";

        if (unarmed.damage?.parts && unarmed.damage.parts.length > 0) {
          unarmedDamage = unarmed.damage.parts
            .map((part) => {
              let dice = "";
              if (part.value?.custom?.enabled && part.value?.custom?.formula) {
                const formula = part.value.custom.formula;
                const diceMatch = formula.match(/@prof(d\d+)/);
                if (diceMatch) {
                  dice = `${proficiency}${diceMatch[1]}`;
                }
              } else if (part.value?.dice) {
                dice = `${proficiency}${part.value.dice}`;
              }
              const bonus = part.value?.bonus ? ` + ${part.value.bonus}` : "";
              const typeIcons = part.type
                ? [...part.type]
                    .map((t) =>
                      t === "magical"
                        ? '<i class="fa-solid fa-wand-sparkles"></i>'
                        : '<i class="fa-solid fa-hand-fist"></i>',
                    )
                    .join(" ")
                : "";
              return `${dice}${bonus}&nbsp;&nbsp;${typeIcons}`;
            })
            .join(", ");
        }

        context.unarmedAttack = {
          item: {
            name: game.i18n.localize(
              unarmed.name || "DAGGERHEART.GENERAL.unarmedAttack",
            ),
            img: "icons/skills/melee/unarmed-punch-fist-yellow-red.webp",
            uuid: "unarmed-attack",
            system: {
              actions: new Map([[unarmed._id, unarmed]]),
              attack: unarmed,
            },
          },
          tags: [{ label: "Unarmed", tagClass: "tag-green" }],
          hopeCost: 0,
          usesData: null,
          enrichedDescription: "",
          damage: unarmedDamage,
        };
      }
    }

    async _prepareEffectsData(context) {
      const getItemTypeName = (type) => {
        const typeMap = {
          feature: "Feature",
          domainCard: "Domain Card",
          weapon: "Weapon",
          armor: "Armor",
          consumable: "Consumable",
          loot: "Loot",
          character: "Character",
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

    async _prepareBiographyData(context) {
      const { system } = this.actor;
      const { TextEditor } = foundry.applications.ux;

      const paths = {
        background: "biography.background",
        connections: "biography.connections",
      };

      for (const [key, path] of Object.entries(paths)) {
        const value = foundry.utils.getProperty(system, path);
        context[key] = {
          field: system.schema.getField(path),
          value,
          enriched: await TextEditor.implementation.enrichHTML(value, {
            secrets: this.actor.isOwner,
            relativeTo: this.actor,
          }),
        };
      }
    }

    async _prepareQuickAccessData(context) {
      const quickAccessUuids =
        this.actor.getFlag("daggerheart-sleek-ui", "quickAccess") || [];
      const quickAccessItems = [];

      for (const uuid of quickAccessUuids) {
        if (uuid.startsWith("divider-")) {
          quickAccessItems.push({ isDivider: true, dividerUuid: uuid });
          continue;
        }

        const item = await fromUuid(uuid);
        if (!item) continue;

        let itemData = null;

        if (item.type === "weapon") {
          itemData = context.weapons?.find((w) => w.item.uuid === uuid);
        } else if (item.type === "armor") {
          itemData = context.armors?.find((a) => a.item.uuid === uuid);
        } else if (item.type === "domainCard") {
          itemData =
            context.loadoutCards?.find((c) => c.item.uuid === uuid) ||
            context.vaultCards?.find((c) => c.item.uuid === uuid);
        } else if (item.type === "consumable") {
          itemData = context.consumables?.find((c) => c.item.uuid === uuid);
        } else if (item.type === "loot") {
          itemData = context.loots?.find((l) => l.item.uuid === uuid);
        } else if (item.type === "feature") {
          itemData =
            context.heritageFeatures?.find((f) => f.item.uuid === uuid) ||
            context.classFeatures?.find((f) => f.item.uuid === uuid) ||
            context.multiclassFeatures?.find((f) => f.item.uuid === uuid) ||
            context.extraFeatures?.find((f) => f.item.uuid === uuid);
        }

        if (itemData) {
          quickAccessItems.push({ ...itemData, itemType: item.type });
        }
      }

      context.quickAccessItems = quickAccessItems;
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
      this._restoreCompactCardHover();

      if (this._savedScrollPosition !== undefined) {
        const mainSheet = this.element.querySelector(".tab-content");
        if (mainSheet) {
          mainSheet.scrollTop = this._savedScrollPosition;
        }
      }

      if (this._savedSidebarScrollPosition !== undefined) {
        const sidebar = this.element.querySelector(".favorites");
        if (sidebar) {
          sidebar.scrollTop = this._savedSidebarScrollPosition;
        }
      }
    }

    _createFilterMenus(html) {}

    _restoreCardStates() {
      const mainSheet = this.element.querySelector(".tab-content");
      if (!mainSheet) return;

      this.openCards.forEach((uuid) => {
        const header = mainSheet.querySelector(
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

    _restoreCompactCardHover() {
      if (!this.hoveredCompactCard) return;

      const card = this.element.querySelector(
        `.compact.card-wrapper[data-item-uuid="${this.hoveredCompactCard}"]`,
      );
      if (!card) return;

      const hoverArea = card.querySelector(".hover-area");
      if (!hoverArea) return;

      hoverArea.classList.add("force-hover");

      setTimeout(() => {
        if (!hoverArea.matches(":hover")) {
          hoverArea.classList.remove("force-hover");
        }
      }, 100);
    }

    _attachPartListeners(partId, htmlElement, options) {
      super._attachPartListeners?.(partId, htmlElement, options);

      this._attachLevelListener(htmlElement);
      this._attachHopeListener(htmlElement);
      this._attachResourceListeners(htmlElement);
      this._attachUsesListeners(htmlElement);
      this._attachCardListeners(htmlElement);
      this._attachSimpleResourceListeners(htmlElement);
      this._attachDieResourceListeners(htmlElement);
      this._attachDiceResourceListeners(htmlElement);
      this._attachRecallListeners(htmlElement);
      this._attachDamageRollListeners(htmlElement);
      this._attachQuantityListeners(htmlElement);
      this._attachCompactCardHoverListeners(htmlElement);
      this._attachBasicTabListeners(htmlElement);

      htmlElement.querySelectorAll(".card-resource").forEach((el) => {
        if (el.textContent.trim() === "" && el.children.length === 0) {
          el.style.display = "none";
        }
      });
    }

    _attachCompactCardHoverListeners(htmlElement) {
      const compactCards = htmlElement.querySelectorAll(
        ".compact.card-wrapper",
      );

      compactCards.forEach((card) => {
        const hoverArea = card.querySelector(".hover-area");
        if (!hoverArea) return;

        hoverArea.addEventListener("mouseenter", () => {
          const itemUuid = card.dataset.itemUuid;
          this.hoveredCompactCard = itemUuid;
        });

        hoverArea.addEventListener("mouseleave", () => {
          this.hoveredCompactCard = null;
          hoverArea.classList.remove("force-hover");
        });
      });
    }

    _attachLevelListener(htmlElement) {
      const levelInput = htmlElement.querySelector(".level-number");
      if (!levelInput) return;

      levelInput.addEventListener("change", async (event) => {
        const newLevel = parseInt(event.target.value);
        await this.actor.update({ "system.levelData.level.changed": newLevel });
      });
    }

    _attachHopeListener(htmlElement) {
      const hopeLabel = htmlElement.querySelector(".hope-container h3");
      if (!hopeLabel) return;

      hopeLabel.addEventListener("click", async () => {
        const currentHope = this.actor.system.resources.hope.value;
        const maxHope = this.actor.system.resources.hope.max;
        if (currentHope < maxHope) {
          await this.actor.update({
            "system.resources.hope.value": currentHope + 1,
          });
        }
      });

      hopeLabel.addEventListener("contextmenu", async (event) => {
        event.preventDefault();
        const currentHope = this.actor.system.resources.hope.value;
        if (currentHope > 0) {
          await this.actor.update({
            "system.resources.hope.value": currentHope - 1,
          });
        }
      });
    }

    _attachResourceListeners(htmlElement) {
      const resourceHeaders = htmlElement.querySelectorAll(".resource-header");
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

      const resourceModifiers = htmlElement.querySelectorAll(
        '[data-action="modifyResource"]',
      );
      resourceModifiers.forEach((element) => {
        element.addEventListener("contextmenu", (event) => {
          this.constructor._onModifyResource.call(this, event, element);
        });
      });
    }

    _attachUsesListeners(htmlElement) {
      const usesResources = htmlElement.querySelectorAll(".uses-resource");
      usesResources.forEach((element) => {
        element.addEventListener("click", async (event) => {
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
      const simpleResources = htmlElement.querySelectorAll(".simple-resource");
      simpleResources.forEach((element) => {
        element.addEventListener("click", async (event) => {
          const itemUuid = element.dataset.itemUuid;
          if (!itemUuid) return;

          const item = await fromUuid(itemUuid);
          if (!item) return;

          const maxValue = parseInt(element.dataset.max) || 0;
          const currentValue = item.system.resource.value || 0;
          const newValue = Math.min(maxValue, currentValue + 1);

          await item.update({ "system.resource.value": newValue });
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
            const newValue = Math.max(0, currentValue - 1);

            await item.update({ "system.resource.value": newValue });
          },
          true,
        );
      });
    }

    _attachDieResourceListeners(htmlElement) {
      const dieResources = htmlElement.querySelectorAll(".die-resource");
      dieResources.forEach((element) => {
        element.addEventListener("click", async (event) => {
          const itemUuid = element.dataset.itemUuid;
          if (!itemUuid) return;

          const item = await fromUuid(itemUuid);
          if (!item) return;

          const dieFaces =
            parseInt(element.dataset.dieFaces.replace("d", "")) || 6;
          const currentValue = item.system.resource.value || 0;
          const newValue = (currentValue + 1) % (dieFaces + 1);

          await item.update({ "system.resource.value": newValue });
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
            const newValue = Math.max(0, currentValue - 1);

            await item.update({ "system.resource.value": newValue });
          },
          true,
        );
      });
    }

    _attachDiceResourceListeners(htmlElement) {
      const diceResources = htmlElement.querySelectorAll(".dice-resource");
      diceResources.forEach((resource) => {
        const diceValues = resource.querySelectorAll(".dice-value");
        diceValues.forEach((diceValue) => {
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

    _attachCardListeners(htmlElement) {
      const cardNameContainers = htmlElement.querySelectorAll(
        ".card-text, .card-resource",
      );
      cardNameContainers.forEach((nameContainer) => {
        nameContainer.addEventListener("click", (event) => {
          if (
            event.target.closest(
              '.card-controls, [data-action="useItem"], .uses-resource, .simple-resource, .die-resource, .dice-resource, .recall-resource, .roll-damage, .quantity-resource',
            )
          ) {
            return;
          }
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

    _attachRecallListeners(htmlElement) {
      const recallButtons = htmlElement.querySelectorAll(".recall-resource");
      recallButtons.forEach((element) => {
        element.addEventListener("click", async (event) => {
          event.stopPropagation();

          const cardHeader = element.closest("[data-item-uuid]");
          if (!cardHeader) return;

          const itemUuid = cardHeader.dataset.itemUuid;
          const item = await fromUuid(itemUuid);
          if (!item) return;

          const recallCost = item.system.recallCost;
          const currentStress = this.actor.system.resources.stress.value;
          const maxStress = this.actor.system.resources.stress.max;

          if (currentStress + recallCost > maxStress) {
            ui.notifications.warn(
              `${game.i18n.localize("DAGGERHEART.UI.Notifications.notEnoughStress")}`,
            );
            return;
          }

          const loadoutSlot = this.actor.system.loadoutSlot;
          if (
            loadoutSlot.max !== null &&
            loadoutSlot.current >= loadoutSlot.max
          ) {
            ui.notifications.warn(
              `${game.i18n.localize("DAGGERHEART.UI.Notifications.loadoutMaxReached")}`,
            );
            return;
          }

          await Promise.all([
            item.update({ "system.inVault": false }),
            this.actor.update({
              "system.resources.stress.value": currentStress + recallCost,
            }),
          ]);
        });
      });
    }

    _attachDamageRollListeners(htmlElement) {
      htmlElement.querySelectorAll(".roll-damage").forEach((button) => {
        button.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();

          const itemUuid = button.dataset.itemUuid;

          if (itemUuid === "unarmed-attack") {
            const action = this.actor.system.usedUnarmed;
            if (!action) return;

            const config = action.prepareConfig(event);
            config.effects =
              await game.system.api.data.actions.actionsTypes.base.getEffects(
                this.actor,
                null,
              );
            config.hasRoll = false;
            action.workflow.get("damage").execute(config, null, true);
            return;
          }

          const item = await fromUuid(itemUuid);
          if (!item) return;

          const action = item.system.attack;
          const config = action.prepareConfig(event);
          config.effects =
            await game.system.api.data.actions.actionsTypes.base.getEffects(
              this.actor,
              item,
            );
          config.hasRoll = false;
          action.workflow.get("damage").execute(config, null, true);
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
          await item.update({
            "system.quantity": item.system.quantity + amount,
          });
        });

        element.addEventListener(
          "contextmenu",
          async (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            const itemUuid = element.dataset.itemUuid;
            const item = await fromUuid(itemUuid);
            const current = item.system.quantity;
            const amount = event.shiftKey ? 10 : 1;
            const newValue = Math.max(0, current - amount);
            await item.update({ "system.quantity": newValue });
          },
          true,
        );
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

    static async _onToggleHope(event, target) {
      const clickedValue = parseInt(target.dataset.value);
      const currentHope = this.actor.system.resources.hope.value;
      const newHope =
        clickedValue === currentHope ? currentHope - 1 : clickedValue;
      await this.actor.update({ "system.resources.hope.value": newHope });
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
      const maxValue =
        resource === "system.armor.system.marks.value"
          ? this.actor.system.armorScore
          : foundry.utils.getProperty(this.actor, maxPath);

      const newValue = Math.max(0, Math.min(maxValue, currentValue + amount));

      if (resource === "system.armor.system.marks.value") {
        await this.actor.items
          .get(this.actor.system.armor._id)
          .update({ "system.marks.value": newValue });
      } else {
        await this.actor.update({ [resource]: newValue });
      }
    }

    static async _onToggleResource(event, target) {
      const resource = target.dataset.resource;
      const clickedValue = parseInt(target.dataset.value);
      const currentValue = foundry.utils.getProperty(this.actor, resource);
      const newValue =
        clickedValue === currentValue ? currentValue - 1 : clickedValue;

      if (resource === "system.armor.system.marks.value") {
        await this.actor.items.get(this.actor.system.armor._id).update({
          "system.marks.value": Math.max(0, newValue),
        });
      } else {
        await this.actor.update({ [resource]: Math.max(0, newValue) });
      }
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

    static async _onUseAction(event, target) {
      const itemUuid =
        target.dataset.itemUuid ||
        target.closest("[data-item-uuid]")?.dataset.itemUuid;
      const actionId = target.dataset.actionId;

      if (!itemUuid || !actionId) return;

      const item = await fromUuid(itemUuid);
      if (!item) {
        ui.notifications.warn("Item not found");
        return;
      }

      const action = item.system.actions?.get(actionId);
      if (!action) {
        ui.notifications.warn("Action not found");
        return;
      }

      await action.use(event);
    }

    _onDragStart(event) {
      const card = event.target.closest("[data-item-uuid]");
      if (!card) return;

      const itemUuid = card.dataset.itemUuid;

      if (itemUuid.startsWith("divider-")) {
        const dragData = { type: "Divider", uuid: itemUuid };
        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
        return;
      }

      const item = fromUuidSync(itemUuid);
      if (!item) return;

      if (item.parent === this.actor) {
        SleekCharacterSheet.draggedItem = {
          itemId: item.id,
          actorId: this.actor.id,
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

      if (data && data.type === "Divider") {
        const quickAccessArea = event.target.closest(".favorites-list");
        const container = quickAccessArea?.closest(".favorites-container");
        const isQuickAccess =
          container
            ?.querySelector(".favorites-header h3")
            ?.textContent.trim() === "Quick Access";

        if (quickAccessArea && isQuickAccess) {
          event.preventDefault();
          event.stopPropagation();

          const quickAccessItems =
            this.actor.getFlag("daggerheart-sleek-ui", "quickAccess") || [];
          const draggedUuid = data.uuid;

          const dropTarget = event.target.closest(".compact.card-wrapper");
          if (!dropTarget) return false;

          const targetUuid = dropTarget.dataset.itemUuid;
          if (!targetUuid || targetUuid === draggedUuid) return false;

          const currentIndex = quickAccessItems.indexOf(draggedUuid);
          const targetIndex = quickAccessItems.indexOf(targetUuid);

          if (currentIndex === -1 || targetIndex === -1) return false;

          quickAccessItems.splice(currentIndex, 1);
          quickAccessItems.splice(targetIndex, 0, draggedUuid);

          await this.actor.setFlag(
            "daggerheart-sleek-ui",
            "quickAccess",
            quickAccessItems,
          );
          return false;
        }
      }

      if (!data || data.type !== "Item") {
        return super._onDrop?.(event);
      }

      const item = await fromUuid(data.uuid);
      if (!item && !data.uuid?.startsWith("divider-")) return;

      const quickAccessArea = event.target.closest(".favorites-list");
      const container = quickAccessArea?.closest(".favorites-container");
      const isQuickAccess =
        container?.querySelector(".favorites-header h3")?.textContent.trim() ===
        "Quick Access";

      if (quickAccessArea && isQuickAccess) {
        event.preventDefault();
        event.stopPropagation();

        const quickAccessItems =
          this.actor.getFlag("daggerheart-sleek-ui", "quickAccess") || [];
        const draggedUuid = item?.uuid || data.uuid;

        if (quickAccessItems.includes(draggedUuid)) {
          const dropTarget = event.target.closest(".compact.card-wrapper");
          if (!dropTarget) return false;

          const targetUuid = dropTarget.dataset.itemUuid;
          if (!targetUuid || targetUuid === draggedUuid) return false;

          const currentIndex = quickAccessItems.indexOf(draggedUuid);
          const targetIndex = quickAccessItems.indexOf(targetUuid);

          if (currentIndex === -1 || targetIndex === -1) return false;

          quickAccessItems.splice(currentIndex, 1);
          quickAccessItems.splice(targetIndex, 0, draggedUuid);

          await this.actor.setFlag(
            "daggerheart-sleek-ui",
            "quickAccess",
            quickAccessItems,
          );
          return false;
        }

        const dropTarget = event.target.closest(".compact.card-wrapper");
        if (dropTarget) {
          const targetUuid = dropTarget.dataset.itemUuid;
          const targetIndex = quickAccessItems.indexOf(targetUuid);

          if (targetIndex !== -1) {
            quickAccessItems.splice(targetIndex, 0, item.uuid);
          } else {
            quickAccessItems.push(item.uuid);
          }
        } else {
          quickAccessItems.push(item.uuid);
        }

        await this.actor.setFlag(
          "daggerheart-sleek-ui",
          "quickAccess",
          quickAccessItems,
        );
        return false;
      }

      if (item.parent === this.actor) {
        event.preventDefault();
        event.stopPropagation();

        const dropTarget = event.target.closest(".card-wrapper");
        if (!dropTarget) return;

        const targetUuid = dropTarget.dataset.itemUuid;
        const targetItem = await fromUuid(targetUuid);
        if (!targetItem || targetItem === item) return;

        if (item.type !== targetItem.type) return;

        const siblings = this.actor.items
          .filter((i) => i.type === item.type)
          .sort((a, b) => a.sort - b.sort);

        const draggedIndex = siblings.indexOf(item);
        const targetIndex = siblings.indexOf(targetItem);

        siblings.splice(draggedIndex, 1);
        siblings.splice(targetIndex, 0, item);

        const updateData = siblings.map((sibling, index) => ({
          _id: sibling.id,
          sort: (index + 1) * 100000,
        }));

        await this.actor.updateEmbeddedDocuments("Item", updateData);
        return false;
      }

      if (item.parent && item.parent.type === "character") {
        event.preventDefault();
        event.stopPropagation();

        const sourceItem = item;
        const sourceActor = item.parent;

        const itemData = item.toObject();
        const createdItems = await this.actor.createEmbeddedDocuments("Item", [
          itemData,
        ]);

        if (createdItems && createdItems.length > 0) {
          await sourceActor.deleteEmbeddedDocuments("Item", [sourceItem.id]);
          ui.notifications.info(
            `Transferred ${sourceItem.name} to ${this.actor.name}`,
          );
        }

        return false;
      } else {
        return super._onDrop?.(event);
      }
    }

    static async _onNavigateToCard(event, target) {
      if (
        event.target.closest(
          ".hover-area, .uses-resource, .simple-resource, .die-resource, .dice-resource, .recall-resource, .roll-damage, .quantity-resource",
        )
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const itemUuid = target.dataset.itemUuid;
      const itemType = target.dataset.type;

      if (!itemUuid) return;

      let targetTab = null;

      if (itemType === "domainCard") {
        targetTab = "loadout";
      } else if (
        itemType === "weapon" ||
        itemType === "armor" ||
        itemType === "consumable" ||
        itemType === "loot"
      ) {
        targetTab = "inventory";
      } else if (itemType === "feature") {
        targetTab = "features";
      }

      if (!targetTab) return;

      const needsTabSwitch = !this.tabs[targetTab].active;
      const wasAlreadyOpen = this.openCards.has(itemUuid);
      const cardsToReopen = wasAlreadyOpen ? [itemUuid] : [];

      this.openCards.clear();
      cardsToReopen.forEach((uuid) => this.openCards.add(uuid));
      this.openCards.add(itemUuid);

      if (needsTabSwitch) {
        Object.keys(this.tabs).forEach((key) => {
          this.tabs[key].active = key === targetTab;
        });

        await this.render(false, { parts: ["mainSheet"] });
        await new Promise((resolve) => setTimeout(resolve, 50));
      } else {
        const mainSheet = this.element.querySelector(".tab-content");
        if (mainSheet) {
          mainSheet
            .querySelectorAll(".card-container.description")
            .forEach((desc) => {
              const wrapper = desc.closest(".card-wrapper");
              const uuid =
                wrapper?.querySelector("[data-item-uuid]")?.dataset.itemUuid;
              if (uuid !== itemUuid) {
                desc.style.display = "none";
              }
            });

          const targetHeader = mainSheet.querySelector(
            `.card-container.header[data-item-uuid="${itemUuid}"]`,
          );
          if (targetHeader) {
            const cardWrapper = targetHeader.closest(".card-wrapper");
            const description = cardWrapper?.querySelector(
              ".card-container.description",
            );
            if (description) {
              description.style.display = "flex";
            }
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const mainSheet = this.element.querySelector(".tab-content");
      if (!mainSheet) return;

      const originalCard = mainSheet.querySelector(
        `.card-container.header[data-item-uuid="${itemUuid}"]`,
      );
      if (!originalCard) return;

      const cardWrapper = originalCard.closest(".card-wrapper");

      if (cardWrapper) {
        const margin = 32;
        const cardHeight = cardWrapper.offsetHeight;
        const containerHeight = mainSheet.clientHeight;

        if (cardHeight + margin * 2 <= containerHeight) {
          const idealScrollPosition = cardWrapper.offsetTop - margin;
          mainSheet.scrollTo({ top: idealScrollPosition, behavior: "smooth" });
        } else {
          const scrollTop = cardWrapper.offsetTop - margin;
          mainSheet.scrollTo({ top: scrollTop, behavior: "smooth" });
        }

        cardWrapper.style.transition = "background-color 0.5s ease";
        cardWrapper.style.backgroundColor = "rgba(79, 89, 137, 0.3)";

        setTimeout(() => {
          cardWrapper.style.backgroundColor = "";
        }, 500);
      }
    }

    static async _onAddToQuickAccess(event, target) {
      const itemUuid = target.dataset.itemUuid;
      if (!itemUuid) return;

      const quickAccessItems =
        this.actor.getFlag("daggerheart-sleek-ui", "quickAccess") || [];

      if (quickAccessItems.includes(itemUuid)) {
        ui.notifications.warn("Item is already in Quick Access");
        return;
      }

      quickAccessItems.push(itemUuid);
      await this.actor.setFlag(
        "daggerheart-sleek-ui",
        "quickAccess",
        quickAccessItems,
      );
    }

    static async _onRemoveFromQuickAccess(event, target) {
      const itemUuid = target.dataset.itemUuid;
      if (!itemUuid) return;

      const quickAccessItems =
        this.actor.getFlag("daggerheart-sleek-ui", "quickAccess") || [];
      const filtered = quickAccessItems.filter((uuid) => uuid !== itemUuid);

      await this.actor.setFlag("daggerheart-sleek-ui", "quickAccess", filtered);
    }

    static async _onAddQuickAccessDivider(event, target) {
      const quickAccessItems =
        this.actor.getFlag("daggerheart-sleek-ui", "quickAccess") || [];
      const dividerUuid = `divider-${foundry.utils.randomID()}`;

      quickAccessItems.unshift(dividerUuid);
      await this.actor.setFlag(
        "daggerheart-sleek-ui",
        "quickAccess",
        quickAccessItems,
      );
    }

    static async _onCancelBeastform(event, target) {
      const itemUuid = target.closest("[data-item-uuid]")?.dataset.itemUuid;
      if (!itemUuid) return;

      const item = await fromUuid(itemUuid);
      console.log("Item:", item);
      console.log("Item actor:", item?.actor);
      console.log("Item parent:", item?.parent);

      if (!item) return;

      game.system.api.fields.ActionFields.BeastformField.handleActiveTransformations.call(
        item,
      );
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
          CONFIG.Actor.sheetClasses.character["daggerheart.CharacterSheet"];
        if (systemSheet) {
          const defaultSheet = new systemSheet.cls({ document: this.actor });
          return defaultSheet.render(true, _options);
        }
      }
      return super.render(options, _options);
    }
  }

  DocumentSheetConfig.registerSheet(Actor, "daggerheart", SleekCharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "DH Sleek UI",
  });

  Hooks.on("preCreateItem", async (item, data, options, userId) => {
    if (!SleekCharacterSheet.draggedItem) return;
    if (userId !== game.user.id) return;

    const dragData = SleekCharacterSheet.draggedItem;

    if (
      item.parent?.type === "character" &&
      item.parent?.id !== dragData.actorId
    ) {
      setTimeout(async () => {
        const sourceActor = game.actors.get(dragData.actorId);
        if (sourceActor) {
          const sourceItem = sourceActor.items.get(dragData.itemId);
          if (sourceItem) {
            await sourceActor.deleteEmbeddedDocuments("Item", [
              dragData.itemId,
            ]);
            ui.notifications.info(
              `Transferred ${dragData.itemName} from ${sourceActor.name}`,
            );
          }
        }

        SleekCharacterSheet.draggedItem = null;
      }, 50);
    }
  });

  document.addEventListener("dragend", () => {
    SleekCharacterSheet.draggedItem = null;
  });
}
