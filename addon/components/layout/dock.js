import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { getOwner } from '@ember/application';
import { guidFor } from '@ember/object/internals';
import { later, cancel, schedule } from '@ember/runloop';
import { activateItem, dockEntry, hasCommandModifier, isRouteActive, modifierKeyLabel, moveFocus, optionalService } from '../../utils/shell';

/** How long the pointer rests on a module before "open flyout on hover" opens it. */
export const HOVER_OPEN_DELAY = 150;

/**
 * `Layout::Dock` — the canvas shell's icon-only module dock.
 *
 * Modules come from ember-core's `dock` service (`items`, in the user's order,
 * already filtered to what they may see; `lockedIds`). Without that service the
 * dock falls back to `universe.headerMenuItems`, the classic header's source.
 * `@items` overrides both.
 *
 * Each module is an icon button. Its name, ⌘ shortcut and status show in a
 * tooltip to the right on hover and on keyboard focus, and are its accessible
 * name. The module of the current route is filled in its colour and carries an
 * indicator. Choosing a module navigates to it and opens its flyout of pages;
 * the flyout can be pinned open as a rail (`dock-preferences.pinRail`).
 *
 * Keyboard: ↑/↓, Home and End move between modules; → opens the focused
 * module's flyout; Escape closes it. ⌘1–⌘9 (Ctrl elsewhere) jump to the first
 * nine modules and ⌘0 opens "All apps", the dock customizer.
 *
 * The flyout always renders, hidden while closed, because it holds
 * `#sidebar-menu-items`: engines that still use `Layout::YieldSidebar` wormhole
 * their sidebar into it.
 */
export default class LayoutDockComponent extends Component {
    @service router;
    @service universe;
    @service dockPreferences;

    @tracked flyoutId = null;
    @tracked tooltipId = null;
    // Set together with tooltipId; the tooltip renders (and reads it) only once that is set.
    @tracked tooltipAnchor;
    @tracked focusedId = null;
    @tracked isCustomizerOpen = false;

    id = guidFor(this);
    hoverTimer = null;

    constructor() {
        super(...arguments);
        document.addEventListener('keydown', this.onDocumentKeydown);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        document.removeEventListener('keydown', this.onDocumentKeydown);
        cancel(this.hoverTimer);
    }

    get dock() {
        return optionalService(getOwner(this), 'dock');
    }

    get tooltipElementId() {
        return `${this.id}-tooltip`;
    }

    get entries() {
        const items = this.args.items || (this.dock && this.dock.items) || this.universe.headerMenuItems.filter((item) => !item._isShortcut);
        const lockedIds = (this.dock && this.dock.lockedIds) || [];
        const modifierKey = modifierKeyLabel();

        return items.map((item, index) => {
            const entry = dockEntry(item, index, { lockedIds, modifierKey });
            entry.isActive = isRouteActive(this.router, entry.route);
            return entry;
        });
    }

    get activeEntry() {
        return this.entries.find((entry) => entry.isActive) || null;
    }

    get isPinned() {
        return this.dockPreferences.pinRail;
    }

    /** The module whose pages the flyout shows: the one opened, else (pinned) the current one. */
    get flyoutEntry() {
        if (this.flyoutId) {
            return this.entries.find((entry) => entry.id === this.flyoutId) || null;
        }

        return this.isPinned ? this.activeEntry : null;
    }

    get isFlyoutOpen() {
        return this.flyoutEntry !== null;
    }

    /** The engine sidebar wormholed into the flyout belongs to the current module only. */
    get showsAdapter() {
        const active = this.activeEntry;
        return this.isFlyoutOpen && active !== null && this.flyoutEntry.id === active.id;
    }

    get tooltipEntry() {
        return this.entries.find((entry) => entry.id === this.tooltipId) || null;
    }

    /** The one module button in the tab order: the focused, else the current, else the first. */
    get tabbableId() {
        const entries = this.entries;
        if (entries.some((entry) => entry.id === this.focusedId)) {
            return this.focusedId;
        }

        const active = this.activeEntry;
        if (active) {
            return active.id;
        }

        return entries.length ? entries[0].id : null;
    }

    get dockClass() {
        const { position, size } = this.dockPreferences;
        return `fb-dock is-${position} is-${size} ${this.dockPreferences.showBadges ? 'shows-badges' : ''}`;
    }

    @action activate(entry) {
        activateItem(this.router, entry.item);
        this.flyoutId = this.flyoutId === entry.id ? null : entry.id;
    }

    @action openFlyout(entry) {
        this.flyoutId = entry.id;
    }

    /**
     * Closes the flyout and returns focus to its module. Closing the rail of a
     * pinned flyout unpins it; closing a module opened over the rail goes back
     * to the rail.
     */
    @action closeFlyout() {
        const entry = this.flyoutEntry;
        if (this.flyoutId) {
            this.flyoutId = null;
        } else {
            this.dockPreferences.update('pinRail', false);
        }
        document.querySelector(`[data-dock-item="${entry.id}"]`).focus();
    }

    @action togglePin() {
        this.dockPreferences.toggle('pinRail');
    }

    @action showTooltip(entry, event) {
        this.tooltipId = entry.id;
        this.tooltipAnchor = event.currentTarget;
    }

    @action hideTooltip() {
        this.tooltipId = null;
        this.tooltipAnchor = null;
    }

    @action onPointerEnter(entry, event) {
        this.showTooltip(entry, event);
        if (this.dockPreferences.openOnHover) {
            cancel(this.hoverTimer);
            this.hoverTimer = later(this, this.openFlyout, entry, HOVER_OPEN_DELAY);
        }
    }

    @action onPointerLeave() {
        cancel(this.hoverTimer);
        this.hideTooltip();
    }

    /**
     * Hides the module's tooltip when it loses focus. Deferred to the end of
     * the run loop: removing a focused module from the dock blurs it in the
     * middle of rendering, where tracked state must not change. Only that
     * module's tooltip is hidden, so moving focus never hides the next one.
     */
    @action onBlur(entry) {
        schedule('actions', this, () => {
            if (this.tooltipId === entry.id) {
                this.hideTooltip();
            }
        });
    }

    @action onFocus(entry, event) {
        this.focusedId = entry.id;
        this.showTooltip(entry, event);
    }

    @action onKeydown(event) {
        const steps = { ArrowDown: 1, ArrowUp: -1, Home: -Infinity, End: Infinity };
        if (event.key in steps) {
            event.preventDefault();
            moveFocus(event.currentTarget.querySelectorAll('[data-dock-item]'), steps[event.key]);
            return;
        }

        const id = event.target.getAttribute('data-dock-item');
        const entry = this.entries.find((candidate) => candidate.id === id);
        if (event.key === 'ArrowRight' && entry) {
            event.preventDefault();
            this.openFlyout(entry);
            this.hideTooltip();
        } else if (event.key === 'Escape') {
            this.hideTooltip();
            if (this.flyoutId) {
                this.closeFlyout();
            }
        }
    }

    @action onDocumentKeydown(event) {
        if (!hasCommandModifier(event) || event.altKey || event.shiftKey || !/^[0-9]$/.test(event.key)) {
            return;
        }

        event.preventDefault();
        if (event.key === '0') {
            this.openCustomizer();
            return;
        }

        const entry = this.entries[Number(event.key) - 1];
        if (entry) {
            activateItem(this.router, entry.item);
        }
    }

    @action openCustomizer() {
        this.isCustomizerOpen = true;
    }

    @action closeCustomizer() {
        this.isCustomizerOpen = false;
    }
}
