import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { later, scheduleOnce } from '@ember/runloop';
import { A } from '@ember/array';
import { bind } from '@ember/runloop';

/**
 * Default maximum number of extensions that may be pinned to the header bar
 * before the overflow dropdown is activated.
 */
const DEFAULT_MAX_VISIBLE = 5;

/**
 * localStorage key suffix used when persisting per-user navigation preferences.
 * The full key is prefixed with the user ID by the `currentUser` service.
 */
const NAV_PREFS_KEY = 'smart-nav-menu-prefs';

/**
 * `Layout::Header::SmartNavMenu`
 *
 * A smart, self-managing extension navigation component that replaces the
 * static `next-catalog-menu-items` div in `<Layout::Header />`.
 *
 * ## Features
 * - **Reactive items** – reads directly from `universe.headerMenuItems` via a
 *   getter so the component automatically re-renders whenever a new extension
 *   registers its menu item (no manual event wiring needed).
 * - **Priority+ overflow** – items that do not fit the available header width
 *   are automatically moved into a "More" dropdown.  A `ResizeObserver` on the
 *   host container triggers re-evaluation whenever the viewport changes.
 * - **Hard cap** – by default no more than `DEFAULT_MAX_VISIBLE` extensions
 *   are ever shown in the bar; the rest always live in the dropdown.
 * - **User customisation** – a gear-icon customiser panel lets users choose
 *   which extensions are pinned to the bar and drag-reorder them.
 * - **Persistence** – preferences are written to `localStorage` via the
 *   `currentUser` service's `setOption` / `getOption` helpers so they survive
 *   page refreshes and are scoped per user.
 *
 * @class LayoutHeaderSmartNavMenuComponent
 * @extends Component
 */
export default class LayoutHeaderSmartNavMenuComponent extends Component {
    @service universe;
    @service currentUser;
    @service abilities;

    // ─── Tracked state ────────────────────────────────────────────────────────

    /**
     * Ordered list of item IDs the user has explicitly pinned to the bar.
     * `null` means "no preference saved yet" – fall back to default ordering.
     */
    @tracked pinnedIds = null;

    /** Items currently rendered in the visible bar (respects cap + width). */
    @tracked visibleItems = A([]);

    /** Items that have been pushed into the overflow "More" dropdown. */
    @tracked overflowItems = A([]);

    /** Controls visibility of the "More" dropdown. */
    @tracked isMoreOpen = false;

    /** Controls visibility of the customiser panel. */
    @tracked isCustomizerOpen = false;

    // ─── Private internals ────────────────────────────────────────────────────

    /** Reference to the flex container element observed by ResizeObserver. */
    _containerEl = null;

    /** Active ResizeObserver instance. */
    _resizeObserver = null;

    /** Reference to the "More" wrapper element for outside-click detection. */
    _moreWrapperEl = null;

    /** Bound outside-click handler for cleanup. */
    _outsideClickHandler = null;

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    constructor(owner, args) {
        super(owner, args);
        this._loadPreferences();
        // Listen for new menu items being registered after boot so we
        // re-distribute items without requiring a full re-render.
        this.universe.menuService.on('menuItem.registered', this._onMenuItemRegistered);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this._teardownObserver();
        this._unregisterMoreWrapper();
        // Clean up the universe event listener.
        try {
            this.universe.menuService.off('menuItem.registered', this._onMenuItemRegistered);
        } catch (_) {
            // Non-fatal – service may already be torn down.
        }
    }

    // ─── Reactive computed properties ─────────────────────────────────────────

    /**
     * All permission-filtered header menu items sourced from the universe
     * service.  Defined as a **getter** (not a @tracked property) so that
     * Glimmer's auto-tracking picks up changes to the underlying
     * `TrackedMap`-backed registry whenever a new extension registers its
     * menu item – no manual event wiring required for the initial render.
     */
    get allItems() {
        const raw = this.universe.headerMenuItems ?? [];
        const visible = [];
        for (const item of raw) {
            try {
                if (this.abilities.can(`${item.id} see extension`)) {
                    visible.push(item);
                }
            } catch (_) {
                // Ability not defined – include the item by default so
                // extensions that haven't registered an ability are still shown.
                visible.push(item);
            }
        }
        // Apply mutateMenuItems callback if provided.
        if (typeof this.args.mutateMenuItems === 'function') {
            this.args.mutateMenuItems(visible);
        }
        return A(visible);
    }

    /**
     * Maximum number of items that may sit in the bar.  Consumers can override
     * via `@maxVisible={{n}}`.
     */
    get maxVisible() {
        return this.args.maxVisible ?? DEFAULT_MAX_VISIBLE;
    }

    /** True when there are items that did not fit in the bar. */
    get hasOverflow() {
        return this.overflowItems.length > 0;
    }

    // ─── Setup ────────────────────────────────────────────────────────────────

    /**
     * Called whenever a new menu item is registered with the universe service.
     * Bound arrow function so `this` is preserved when used as an event handler.
     */
    _onMenuItemRegistered = (_menuItem, registryName) => {
        if (registryName === 'header') {
            scheduleOnce('afterRender', this, this._distributeFromAllItems);
        }
    };

    /**
     * Load the user's saved navigation preferences from localStorage.
     * Falls back gracefully when no preferences have been stored yet.
     */
    _loadPreferences() {
        try {
            const raw = this.currentUser.getOption(NAV_PREFS_KEY);
            if (raw && typeof raw === 'object' && Array.isArray(raw.pinnedIds)) {
                this.pinnedIds = raw.pinnedIds;
            }
        } catch (_) {
            // Preferences unavailable – use defaults.
        }
    }

    /**
     * Persist the current preferences to localStorage via the currentUser service.
     */
    _savePreferences() {
        try {
            this.currentUser.setOption(NAV_PREFS_KEY, {
                pinnedIds: this.pinnedIds ?? this.allItems.map((i) => i.id),
            });
        } catch (_) {
            // Non-fatal – silently ignore storage errors.
        }
    }

    /**
     * Re-order `allItems` so that pinned items appear first in the order the
     * user specified.  Unpinned items are appended at the end.
     * Then split into visibleItems / overflowItems.
     */
    _distributeFromAllItems() {
        const { pinnedIds, allItems } = this;

        let ordered;
        if (!pinnedIds || pinnedIds.length === 0) {
            // No saved preference – use natural order from the universe service.
            ordered = [...allItems];
        } else {
            // Build ordered list: pinned first (in user order), then the rest.
            const pinned = [];
            const rest = [];
            for (const id of pinnedIds) {
                const item = allItems.find((i) => i.id === id);
                if (item) pinned.push(item);
            }
            for (const item of allItems) {
                if (!pinnedIds.includes(item.id)) rest.push(item);
            }
            ordered = [...pinned, ...rest];
        }

        this._distributeItems(ordered);
    }

    /**
     * Split `ordered` into `visibleItems` (bar) and `overflowItems` (dropdown)
     * respecting the hard `maxVisible` cap.  Width-based overflow is handled
     * separately by the ResizeObserver path.
     */
    _distributeItems(ordered) {
        const cap = this.maxVisible;
        this.visibleItems = A(ordered.slice(0, cap));
        this.overflowItems = A(ordered.slice(cap));
    }

    // ─── ResizeObserver ───────────────────────────────────────────────────────

    /**
     * Called by the `{{did-insert}}` modifier when the container element mounts.
     * Sets up a ResizeObserver so the component can react to width changes and
     * move items in/out of the overflow dropdown dynamically.
     */
    @action setupContainer(element) {
        this._containerEl = element;
        this._setupObserver(element);
        // Run an initial distribution pass once the DOM has settled.
        scheduleOnce('afterRender', this, this._distributeFromAllItems);
    }

    _setupObserver(element) {
        if (typeof ResizeObserver === 'undefined') return;
        this._resizeObserver = new ResizeObserver(() => {
            scheduleOnce('afterRender', this, this._recalculate);
        });
        this._resizeObserver.observe(element);
    }

    _teardownObserver() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
    }

    /**
     * Measure the available container width and determine how many items fit
     * without overflowing.  Items beyond the hard cap are always in overflow
     * regardless of available space.
     *
     * The algorithm:
     *   1. Start with the full ordered list (pinned first).
     *   2. Measure the width of each rendered item element.
     *   3. Reserve ~44 px for the "More" button.
     *   4. Walk items left-to-right; once cumulative width exceeds available
     *      space, push remaining items to overflow.
     *   5. Never exceed `maxVisible` in the bar.
     */
    _recalculate() {
        const container = this._containerEl;
        if (!container) return;

        const { pinnedIds, allItems, maxVisible } = this;

        // Determine ordered list (same logic as _distributeFromAllItems).
        let ordered;
        if (pinnedIds && pinnedIds.length > 0) {
            const pinned = [];
            const rest = [];
            for (const id of pinnedIds) {
                const item = allItems.find((i) => i.id === id);
                if (item) pinned.push(item);
            }
            for (const item of allItems) {
                if (!pinnedIds.includes(item.id)) rest.push(item);
            }
            ordered = [...pinned, ...rest];
        } else {
            ordered = [...allItems];
        }

        // Available width for nav items (subtract "More" button reservation).
        const MORE_BTN_WIDTH = 44; // px – approximate width of the "⋯" button
        const availableWidth = container.offsetWidth - MORE_BTN_WIDTH;

        // Measure rendered item widths from the DOM.
        const itemEls = Array.from(container.querySelectorAll('.snm-item'));
        const itemWidths = itemEls.map((el) => el.offsetWidth + 8); // 8px gap

        let cumulative = 0;
        let cutoff = 0;

        for (let i = 0; i < ordered.length; i++) {
            if (i >= maxVisible) break;
            const w = itemWidths[i] ?? 120; // fallback estimate
            if (cumulative + w > availableWidth) break;
            cumulative += w;
            cutoff = i + 1;
        }

        // If everything fits and we are under the cap, hide the "More" button.
        if (cutoff === 0 && ordered.length <= maxVisible) {
            cutoff = Math.min(ordered.length, maxVisible);
        }

        this.visibleItems = A(ordered.slice(0, cutoff));
        this.overflowItems = A(ordered.slice(cutoff));
    }

    // ─── Actions ──────────────────────────────────────────────────────────────

    /** Register the "More" wrapper element and attach an outside-click listener. */
    @action registerMoreWrapper(element) {
        this._moreWrapperEl = element;
        this._outsideClickHandler = bind(this, this._handleOutsideClick);
        document.addEventListener('mousedown', this._outsideClickHandler, true);
    }

    /** Clean up the outside-click listener when the wrapper is destroyed. */
    _unregisterMoreWrapper() {
        if (this._outsideClickHandler) {
            document.removeEventListener('mousedown', this._outsideClickHandler, true);
            this._outsideClickHandler = null;
        }
        this._moreWrapperEl = null;
    }

    /** Close the dropdown when a click occurs outside the wrapper element. */
    _handleOutsideClick(event) {
        if (this._moreWrapperEl && !this._moreWrapperEl.contains(event.target)) {
            this.isMoreOpen = false;
        }
    }

    /** Toggle the "More" overflow dropdown open/closed. */
    @action toggleMore() {
        this.isMoreOpen = !this.isMoreOpen;
        if (this.isCustomizerOpen) this.isCustomizerOpen = false;
    }

    /** Close the "More" dropdown (called on outside-click or item selection). */
    @action closeMore() {
        this.isMoreOpen = false;
    }

    /** Open the customiser panel. */
    @action openCustomizer() {
        this.isMoreOpen = false;
        this.isCustomizerOpen = true;
    }

    /** Close the customiser panel without saving. */
    @action closeCustomizer() {
        this.isCustomizerOpen = false;
    }

    /**
     * Called by `NavMenuCustomizer` when the user confirms their selection.
     *
     * @param {string[]} orderedIds - Ordered array of pinned item IDs.
     */
    @action applyCustomization(orderedIds) {
        this.pinnedIds = orderedIds;
        this._savePreferences();
        this._distributeFromAllItems();
        this.isCustomizerOpen = false;
        // Allow the DOM to update then re-measure.
        later(this, this._recalculate, 50);
    }

    /**
     * Reorder handler for drag-sort within the customiser.
     * Kept here so the customiser sub-component stays stateless.
     */
    @action reorderPinned({ sourceList, sourceIndex, targetList, targetIndex }) {
        if (sourceList === targetList && sourceIndex === targetIndex) return;
        const item = sourceList.objectAt(sourceIndex);
        sourceList.removeAt(sourceIndex);
        targetList.insertAt(targetIndex, item);
    }
}
