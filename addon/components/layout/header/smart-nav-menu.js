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
    @service router;
    @service hostRouter;

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

    /**
     * Fixed-position coordinates for the overflow dropdown panel.
     * Calculated from the "More" button's getBoundingClientRect() when opened.
     * The dropdown is rendered via EmberWormhole into #application-root-wormhole
     * so it escapes the 57px header height constraint entirely.
     */
    @tracked dropdownTop = 0;
    @tracked dropdownLeft = 0;

    // ─── Private internals ────────────────────────────────────────────────────

    /** Reference to the flex container element observed by ResizeObserver. */
    _containerEl = null;

    /** Active ResizeObserver instance. */
    _resizeObserver = null;

    /** Reference to the "More" button element for position calculation. */
    _moreBtnEl = null;

    /** Bound outside-click handler for cleanup. */
    _outsideClickHandler = null;

    /** Bound routeDidChange handler for cleanup. */
    _routeDidChangeHandler = null;

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    constructor(owner, args) {
        super(owner, args);
        this._loadPreferences();
        // Listen for new menu items being registered after boot so we
        // re-distribute items without requiring a full re-render.
        try {
            this.universe.menuService.on('menuItem.registered', this._onMenuItemRegistered);
        } catch (_) {
            // Non-fatal – service may not be available in all environments.
        }
        // Close the overflow dropdown automatically after any route transition so
        // we never need to attach a click handler to <LinkToExternal /> elements
        // (which would destroy the element mid-transition and cause a page reload).
        this._routeDidChangeHandler = () => {
            this.isMoreOpen = false;
        };
        try {
            this._getRouter().on('routeDidChange', this._routeDidChangeHandler);
        } catch (_) {
            // Non-fatal – router may not be available in test environments.
        }
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this._teardownObserver();
        this._unregisterMoreBtn();
        // Clean up the universe event listener.
        try {
            this.universe.menuService.off('menuItem.registered', this._onMenuItemRegistered);
        } catch (_) {
            // Non-fatal – service may already be torn down.
        }
        // Clean up the routeDidChange listener.
        try {
            if (this._routeDidChangeHandler) {
                this._getRouter().off('routeDidChange', this._routeDidChangeHandler);
                this._routeDidChangeHandler = null;
            }
        } catch (_) {
            // Non-fatal.
        }
    }

    // ─── Router helper ────────────────────────────────────────────────────────

    /** Returns whichever router service is available, matching mobile-navbar pattern. */
    _getRouter() {
        return this.router ?? this.hostRouter;
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
                pinnedIds: this.pinnedIds ?? [],
            });
        } catch (_) {
            // Non-fatal – silently ignore storage errors.
        }
    }

    /**
     * Distribute `allItems` into `visibleItems` (bar) and `overflowItems` (dropdown).
     *
     * Key behaviour:
     *   - When the user has explicitly saved a pinned list, ONLY those pinned
     *     items appear in the bar (in saved order).  Everything else goes to
     *     overflow regardless of `maxVisible`.  The cap still applies as an
     *     upper bound in case the user somehow saved more than `maxVisible` IDs.
     *   - When no preference has been saved yet (`pinnedIds` is null/empty),
     *     the first `maxVisible` items from the universe registry are shown in
     *     the bar by default, and the rest go to overflow.
     */
    _distributeFromAllItems() {
        const { pinnedIds, allItems, maxVisible } = this;

        if (!pinnedIds || pinnedIds.length === 0) {
            // No saved preference – show first `maxVisible` items by default.
            this.visibleItems = A(allItems.slice(0, maxVisible));
            this.overflowItems = A(allItems.slice(maxVisible));
            return;
        }

        // User has an explicit pinned list.
        // Build the pinned array in the user's saved order (skip stale IDs).
        const pinned = [];
        for (const id of pinnedIds) {
            const item = allItems.find((i) => i.id === id);
            if (item) pinned.push(item);
        }

        // Respect the hard cap (in case maxVisible was reduced after saving).
        const barItems = pinned.slice(0, maxVisible);

        // Everything not in the bar goes to overflow.
        const barIds = new Set(barItems.map((i) => i.id));
        const overflow = allItems.filter((i) => !barIds.has(i.id));

        this.visibleItems = A(barItems);
        this.overflowItems = A(overflow);
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
            // Guard against re-entrancy: if we are already in the middle of a
            // recalculate pass triggered by this same observer, skip.
            if (this._isRecalculating) return;
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
     * When the user has an explicit pinned list, only pinned items are
     * candidates for the bar – unpinned items always stay in overflow.
     */
    _recalculate() {
        const container = this._containerEl;
        if (!container) return;
        // Prevent the ResizeObserver from re-firing while we are mutating the DOM.
        this._isRecalculating = true;

        const { pinnedIds, allItems, maxVisible } = this;

        // Determine which items are candidates for the bar.
        let barCandidates;
        let alwaysOverflow;

        if (pinnedIds && pinnedIds.length > 0) {
            // Only pinned items can appear in the bar.
            const pinned = [];
            for (const id of pinnedIds) {
                const item = allItems.find((i) => i.id === id);
                if (item) pinned.push(item);
            }
            barCandidates = pinned.slice(0, maxVisible);
            const barIds = new Set(barCandidates.map((i) => i.id));
            alwaysOverflow = allItems.filter((i) => !barIds.has(i.id));
        } else {
            barCandidates = allItems.slice(0, maxVisible);
            alwaysOverflow = allItems.slice(maxVisible);
        }

        // Measure rendered item widths from the DOM.
        const itemEls = Array.from(container.querySelectorAll('.snm-item'));

        // If no items have rendered yet, fall back to the simple distribution
        // so we don't incorrectly overflow items based on zero-width measurements.
        if (itemEls.length === 0) {
            this._distributeFromAllItems();
            return;
        }

        const itemWidths = itemEls.map((el) => el.offsetWidth + 8); // 8px gap

        // Measure available width from the PARENT element (.next-view-header-left),
        // not from the container itself.  The container is flex:1 so its offsetWidth
        // shrinks as items are moved to overflow – measuring it creates a
        // chicken-and-egg collapse loop.  The parent is stable (flex:1 of the full
        // header) so its width is independent of how many items are visible.
        const parent = container.closest('.next-view-header-left') || container.parentElement;
        const parentWidth = parent ? parent.offsetWidth : container.offsetWidth;

        // Subtract fixed siblings that are always present in .next-view-header-left:
        //   • Logo + margin: ~60px
        //   • Sidebar toggle (when visible): ~36px
        // We measure them directly from the DOM so the number stays accurate
        // across different configurations.
        let fixedSiblingsWidth = 0;
        if (parent) {
            for (const child of parent.children) {
                // Skip the snm-container itself – we want sibling widths only.
                if (child === container) continue;
                // Also skip zero-width wormhole targets and hidden elements.
                const w = child.offsetWidth;
                if (w > 0) fixedSiblingsWidth += w + 4; // 4px gap allowance
            }
        }

        // Reserve space for the customise button (always rendered inside the container).
        const CUSTOMISE_BTN_WIDTH = 44;
        const availableWidth = parentWidth - fixedSiblingsWidth - CUSTOMISE_BTN_WIDTH;

        let cumulative = 0;
        let cutoff = 0;
        for (let i = 0; i < barCandidates.length; i++) {
            const w = itemWidths[i] ?? 0;
            // Skip items that haven't painted yet (zero width) to avoid
            // incorrectly cutting them to overflow.
            if (w > 0 && cumulative + w > availableWidth) break;
            cumulative += w;
            cutoff = i + 1;
        }

        // If everything fits (or nothing was measured), show all bar candidates.
        if (cutoff === 0 && barCandidates.length > 0) {
            cutoff = barCandidates.length;
        }

        const fitsInBar = barCandidates.slice(0, cutoff);
        const widthOverflow = barCandidates.slice(cutoff);

        // Only mutate tracked state when the distribution actually changes.
        // This prevents the DOM mutation from triggering the ResizeObserver
        // again, which would cause an infinite flicker loop.
        const newVisibleIds = fitsInBar.map((i) => i.id).join(',');
        const newOverflowIds = [...widthOverflow, ...alwaysOverflow].map((i) => i.id).join(',');
        const curVisibleIds = this.visibleItems.map((i) => i.id).join(',');
        const curOverflowIds = this.overflowItems.map((i) => i.id).join(',');
        if (newVisibleIds !== curVisibleIds || newOverflowIds !== curOverflowIds) {
            this.visibleItems = A(fitsInBar);
            this.overflowItems = A([...widthOverflow, ...alwaysOverflow]);
        }
        this._isRecalculating = false;
    }

    // ─── "More" button registration ───────────────────────────────────────────

    /**
     * Register the "More" button element so we can:
     *   1. Calculate its screen position for the fixed-position dropdown.
     *   2. Detect outside-clicks to close the dropdown.
     */
    @action registerMoreBtn(element) {
        this._moreBtnEl = element;
        this._outsideClickHandler = bind(this, this._handleOutsideClick);
        document.addEventListener('mousedown', this._outsideClickHandler, true);
    }

    /** Clean up the outside-click listener when the button is destroyed. */
    _unregisterMoreBtn() {
        if (this._outsideClickHandler) {
            document.removeEventListener('mousedown', this._outsideClickHandler, true);
            this._outsideClickHandler = null;
        }
        this._moreBtnEl = null;
    }

    /** Close the dropdown when a click occurs outside the button and dropdown portal. */
    _handleOutsideClick(event) {
        // Allow clicks inside the wormhole portal (the dropdown itself) to pass through.
        const portal = document.getElementById('application-root-wormhole');
        if (portal && portal.contains(event.target)) return;
        if (this._moreBtnEl && !this._moreBtnEl.contains(event.target)) {
            this.isMoreOpen = false;
        }
    }

    /**
     * Calculate the fixed-position coordinates for the dropdown panel
     * based on the "More" button's current screen position.
     */
    _calculateDropdownPosition() {
        if (!this._moreBtnEl) return;
        const rect = this._moreBtnEl.getBoundingClientRect();
        // Position the dropdown below the button, aligned to its left edge.
        this.dropdownTop = rect.bottom + 6;
        // Ensure the dropdown doesn't overflow the right edge of the viewport.
        // Wide multi-column dropdown (Phase 2: 2 card columns + search bar)
        const dropdownWidth = 680;
        const rightEdge = rect.left + dropdownWidth;
        if (rightEdge > window.innerWidth - 8) {
            this.dropdownLeft = window.innerWidth - dropdownWidth - 8;
        } else {
            this.dropdownLeft = rect.left;
        }
    }

    // ─── Actions ──────────────────────────────────────────────────────────────

    /** Toggle the "More" overflow dropdown open/closed. */
    @action toggleMore() {
        if (!this.isMoreOpen) {
            // Calculate position before opening so the panel renders in the right place.
            this._calculateDropdownPosition();
        }
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
     * True when the bar is at or over the maxVisible cap.
     * Passed to the dropdown so the pin button is disabled when the bar is full.
     */
    get atPinnedLimit() {
        const pinned = this.pinnedIds ?? [];
        return pinned.length >= this.maxVisible;
    }
    /**
     * Quick-pin an overflow item directly from the dropdown.
     * Only allowed when the bar has capacity (pinnedIds.length < maxVisible).
     * Adds the item's ID to pinnedIds, saves preferences, and re-distributes
     * so the item immediately moves from the overflow list to the bar.
     *
     * @param {Object} menuItem
     */
    @action quickPin(menuItem) {
        if (this.atPinnedLimit) return; // bar is full
        const currentPinned = this.pinnedIds ? [...this.pinnedIds] : [];
        const id = menuItem.id ?? menuItem.route;
        if (!id || currentPinned.includes(id)) return; // already pinned
        this.pinnedIds = [...currentPinned, id];
        this._savePreferences();
        this._distributeFromAllItems();
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
