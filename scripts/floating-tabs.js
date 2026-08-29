export class FloatingTabs extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
) {
  static DEFAULT_OPTIONS = {
    id: "floating-tabs-{id}",
    tag: "nav",
    window: { frame: false, positioned: false },
    position: { width: "auto", height: "auto" },
    classes: ["floating-tabs-nav"],
  };

  static PARTS = {
    tabs: {
      template:
        "modules/daggerheart-sleek-ui/templates/components/tabs-floating.hbs",
    },
  };

  constructor(sheet, tabs = {}) {
    super();
    this.sheet = sheet;
    this.actor = sheet?.actor ?? sheet?.document;
    this.tabs = tabs;
  }

  get title() {
    return `${this.actor?.name ?? "Actor"} floating tabs`;
  }

  async _prepareContext() {
    return {
      tabs: Object.values(this.tabs),
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const targetDocument = this.sheet.element.ownerDocument;

    if (this.element.ownerDocument !== targetDocument) {
      targetDocument.body.appendChild(this.element);
    }

    this._position();
    this._bind();
  }

  _bind() {
    const targetWindow = this.sheet.element.ownerDocument.defaultView;

    this._resizeHandler = () => this._position();
    targetWindow.addEventListener("resize", this._resizeHandler);

    if (this.sheet?.element) {
      this._observer = new MutationObserver(() => {
        const isMinimized = this.sheet.element.classList.contains("minimized");
        if (isMinimized) {
          this.element.style.display = "none";
        } else {
          if (this.element.style.display === "none") {
            setTimeout(() => {
              this.element.style.display = "";
              this._position();
            }, 250);
          } else {
            this._position();
          }
        }
      });
      this._observer.observe(this.sheet.element, {
        attributes: true,
        attributeFilter: ["class", "style"],
        subtree: false,
      });

      this._focusHandler = () => this._position();
      this.sheet.element.addEventListener("mousedown", this._focusHandler);
      this.sheet.element.addEventListener("focus", this._focusHandler, true);
    }

    const buttons = this.element?.querySelectorAll(".tab-button");
    buttons?.forEach((btn) => {
      btn.addEventListener("click", (e) => this._onTabClick(e, btn));
    });
  }

  _position() {
    const root = this.sheet?.element;
    const el = this.element;
    if (!root || !el) return;

    const targetWindow = root.ownerDocument.defaultView;
    const isPopOut = targetWindow !== window.top;

    const rect = root.getBoundingClientRect();
    el.style.position = "fixed";

    const parentZIndex = window.getComputedStyle(root).zIndex;
    if (parentZIndex && parentZIndex !== "auto") {
      el.style.zIndex = parentZIndex;
    }

    if (isPopOut) {
      el.style.left = `${rect.right - 45}px`;
      el.style.top = `${rect.top + 100}px`;
    } else {
      el.style.left = `${rect.right}px`;
      el.style.top = `${rect.top + rect.height / 2.5}px`;
    }

    el.style.transform = isPopOut ? "none" : "translateY(-50%)";
  }

  async _onTabClick(event, target) {
    event.preventDefault();
    const tabId = target.dataset.tab;

    Object.keys(this.tabs).forEach((key) => {
      this.tabs[key].active = key === tabId;
    });

    await this.render(false, { parts: ["tabs"] });

    await this.sheet.render(true);
  }

  async close(options = {}) {
    if (this._observer) this._observer.disconnect();
    if (this._resizeHandler && this.sheet?.element) {
      const targetWindow = this.sheet.element.ownerDocument.defaultView;
      targetWindow.removeEventListener("resize", this._resizeHandler);
    }
    if (this._focusHandler && this.sheet?.element) {
      this.sheet.element.removeEventListener("mousedown", this._focusHandler);
      this.sheet.element.removeEventListener("focus", this._focusHandler, true);
    }
    if (this.element) {
      this.element.remove();
    }
  }
}
