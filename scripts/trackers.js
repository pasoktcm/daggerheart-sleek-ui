/**
 * Reskins the Daggerheart system's on-screen Fear tracker and Countdowns UI so
 * they reuse Sleek UI's own component classes and match the rest of the module.
 *
 * These are standalone system ApplicationV2 apps (FearTracker, DhCountdowns), so
 * unlike the actor sheets we don't replace their templates. Instead, on each
 * render we add the module's component classes to their existing DOM; the styling
 * lives in styles/trackers.css (plus the shared component rules those classes
 * already carry).
 */

/** Coerce an ApplicationV2 render payload into the root HTMLElement. */
function rootElement(element) {
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return null;
}

/**
 * Fear tracker (token display): give the skull tokens the module's
 * `.resource.fear-resource` / `.fear-icon-full` / `.fear-icon-empty` classes so
 * they render like the Fear resource on the adversary/environment sheets.
 */
function onRenderFearTracker(_app, element) {
  const root = rootElement(element);
  // 'bar' display mode renders .resource-bar instead of .fear-tokens; it needs no
  // class injection (trackers.css restyles the system's own markup) and must keep
  // the system's full-width sizing, so bail before hugFearWidth.
  const tokens = root?.querySelector(".fear-tokens");
  if (!tokens) return;

  tokens.classList.add("resource", "fear-resource");
  for (const token of tokens.querySelectorAll("a.fear-token")) {
    token.style.filter = ""; // drop the system's per-token hue-rotate
    const empty = token.classList.contains("inactive");
    token.classList.toggle("fear-icon-full", !empty);
    token.classList.toggle("fear-icon-empty", empty);
  }

  hugFearWidth(root);
}

/**
 * Size the Fear panel to its skulls. The system forces full width in the
 * centered positions, and re-applies its position width at the end of render,
 * so we set the width inline+important now and again on the next frame (after
 * that position pass). 'free' mode is left alone so the resize handle works.
 */
function hugFearWidth(root) {
  if (root.classList.contains("free")) return;
  const apply = () => {
    root.style.setProperty("width", "max-content", "important");
    root.style.setProperty("min-width", "auto", "important");
  };
  apply();
  requestAnimationFrame(apply);
}

/**
 * Countdowns: give each card the module's `.card-wrapper`, its name the
 * `.card-text-name` class, and its progress counter the `.tag` pill class.
 */
function onRenderCountdowns(_app, element) {
  const root = rootElement(element);
  if (!root) return;

  for (const toggle of root.querySelectorAll(".header-type-toggles .header-type")) {
    toggle.classList.add("tag");
  }

  for (const card of root.querySelectorAll(".countdown-container")) {
    card.classList.add("card-wrapper");
    card.querySelector(".countdown-content > header")?.classList.add("card-text-name");
    card.querySelector(".progress-tag")?.classList.add("tag");
  }
}

export function registerTrackers() {
  Hooks.on("renderFearTracker", onRenderFearTracker);
  Hooks.on("renderDhCountdowns", onRenderCountdowns);
}
