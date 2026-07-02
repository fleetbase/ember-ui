import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { next, scheduleOnce } from '@ember/runloop';

export default class TabNavigationComponent extends Component {
    @service universe;
    @tracked _activeTabId = null;
    @tracked visibleTabIds = null;
    @tracked overflowTabIds = [];

    _tabListElement = null;
    _tabActionsElement = null;
    _tabMeasurerElement = null;
    _resizeObserver = null;
    _isRecalculating = false;

    constructor(owner, args) {
        super(owner, args);
        this._activeTabId = args.activeTabId || (args.tabs?.[0]?.id ?? null);
        next(() => {
            if (typeof this.args.contextApi === 'function') {
                this.args.contextApi(this.context);
            }
        });
    }

    context = {
        selectTabById: this.selectTabById.bind(this),
    };

    willDestroy() {
        super.willDestroy(...arguments);
        this.teardownResizeObserver();
    }

    get activeTab() {
        if (!this.args.tabs) return null;
        return this.args.tabs.find((tab) => tab.id === this._activeTabId) || null;
    }

    get style() {
        return this.args.style || 'github';
    }

    get size() {
        return this.args.size || 'md';
    }

    // Enhanced tabs with computed active/disabled states for template
    get enhancedTabs() {
        if (!this.args.tabs) return [];

        return this.args.tabs.map((tab) => {
            const enhanced = {
                ...tab,
                isActive: tab.id === this._activeTabId,
                isDisabled: !!tab.disabled,
                hasIcon: !!tab.icon,
                hasBadge: !!(tab.badge && tab.badge > 0),
                isClosable: !!(tab.closable && this.args.onClose),
                badgeText: tab.badge > 99 ? '99+' : String(tab.badge || ''),
            };

            if (tab._isMenuItem) {
                enhanced.model = tab.slug;
                if (tab.view) {
                    enhanced.query = { view: tab.view };
                }
            }

            return enhanced;
        });
    }

    get visibleTabs() {
        const tabs = this.enhancedTabs;
        if (!this.visibleTabIds) return tabs;

        const visibleIds = new Set(this.visibleTabIds);
        return tabs.filter((tab) => visibleIds.has(tab.id));
    }

    get overflowTabs() {
        const overflowIds = new Set(this.overflowTabIds);
        return this.enhancedTabs.filter((tab) => overflowIds.has(tab.id));
    }

    get hasOverflow() {
        return this.overflowTabs.length > 0;
    }

    get moreTabIsActive() {
        return this.overflowTabs.some((tab) => tab.isActive);
    }

    @action selectTab(tab) {
        if (tab.disabled) return;

        this._activeTabId = tab.id;
        if (this.args.onTabChange) {
            this.args.onTabChange(tab);
        }
        scheduleOnce('afterRender', this, this.recalculateOverflow);
    }

    selectTabById(tabId) {
        const tab = this.enhancedTabs.find((t) => t.id === tabId);
        if (!tab) return;
        this.selectTab(tab);
    }

    @action closeTab(tab) {
        if (this.args.onClose) {
            this.args.onClose(tab);
        }
        scheduleOnce('afterRender', this, this.recalculateOverflow);
    }

    @action registerTabList(element) {
        this._tabListElement = element;
        this.setupResizeObserver(element);
        scheduleOnce('afterRender', this, this.recalculateOverflow);
    }

    @action registerTabActions(element) {
        this._tabActionsElement = element;
        scheduleOnce('afterRender', this, this.recalculateOverflow);
    }

    @action registerTabMeasurer(element) {
        this._tabMeasurerElement = element;
        scheduleOnce('afterRender', this, this.recalculateOverflow);
    }

    @action tabsDidChange() {
        scheduleOnce('afterRender', this, this.recalculateOverflow);
    }

    @action argsDidChange() {
        const tabs = this.args.tabs ?? [];
        const hasControlledActiveTab = this.args.activeTabId !== undefined;
        const currentActiveTabExists = tabs.some((tab) => tab.id === this._activeTabId);
        const nextActiveTabId = hasControlledActiveTab ? this.args.activeTabId : currentActiveTabExists ? this._activeTabId : (tabs[0]?.id ?? null);

        if (nextActiveTabId !== this._activeTabId) {
            this._activeTabId = nextActiveTabId;
        }
        scheduleOnce('afterRender', this, this.recalculateOverflow);
    }

    setupResizeObserver(element) {
        if (typeof ResizeObserver === 'undefined') return;

        this.teardownResizeObserver();
        this._resizeObserver = new ResizeObserver(() => {
            if (this._isRecalculating) return;
            scheduleOnce('afterRender', this, this.recalculateOverflow);
        });
        this._resizeObserver.observe(element);
    }

    teardownResizeObserver() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
    }

    recalculateOverflow() {
        if (!this.args.tabs || !this._tabListElement || !this._tabMeasurerElement) return;

        const tabs = this.enhancedTabs;
        if (tabs.length === 0) {
            this.setOverflowState([], []);
            return;
        }

        const availableWidth = this.getAvailableTabWidth();
        const measuredTabs = Array.from(this._tabMeasurerElement.querySelectorAll('[data-tab-navigation-measure-item]'));

        if (availableWidth <= 0 || measuredTabs.length !== tabs.length) {
            this.setOverflowState(
                tabs.map((tab) => tab.id),
                []
            );
            return;
        }

        const tabWidths = measuredTabs.map((element) => element.offsetWidth);
        const totalTabWidth = tabWidths.reduce((sum, width) => sum + width, 0);

        if (totalTabWidth <= availableWidth) {
            this.setOverflowState(
                tabs.map((tab) => tab.id),
                []
            );
            return;
        }

        const moreButton = this._tabMeasurerElement.querySelector('[data-tab-navigation-measure-more]');
        const moreButtonWidth = moreButton?.offsetWidth || 44;
        const constrainedWidth = Math.max(0, availableWidth - moreButtonWidth);
        let usedWidth = 0;
        let cutoff = 0;

        for (let index = 0; index < tabs.length; index++) {
            const width = tabWidths[index] || 0;
            if (cutoff > 0 && usedWidth + width > constrainedWidth) break;
            if (cutoff === 0 && width > constrainedWidth) {
                cutoff = 1;
                break;
            }
            usedWidth += width;
            cutoff = index + 1;
        }

        cutoff = Math.max(1, Math.min(cutoff, tabs.length));

        const visibleTabs = tabs.slice(0, cutoff);
        let overflowTabs = tabs.slice(cutoff);
        const activeOverflowTab = overflowTabs.find((tab) => tab.isActive);

        if (activeOverflowTab && visibleTabs.length > 0) {
            let swapIndex = -1;
            for (let index = visibleTabs.length - 1; index >= 0; index--) {
                if (!visibleTabs[index].isActive) {
                    swapIndex = index;
                    break;
                }
            }
            if (swapIndex > -1) {
                const swappedTab = visibleTabs[swapIndex];
                visibleTabs[swapIndex] = activeOverflowTab;
                overflowTabs = overflowTabs.filter((tab) => tab.id !== activeOverflowTab.id);
                overflowTabs.push(swappedTab);
                overflowTabs.sort((a, b) => tabs.findIndex((tab) => tab.id === a.id) - tabs.findIndex((tab) => tab.id === b.id));
            }
        }

        this.setOverflowState(
            visibleTabs.map((tab) => tab.id),
            overflowTabs.map((tab) => tab.id)
        );
    }

    getAvailableTabWidth() {
        const tabListWidth = this._tabListElement?.clientWidth || 0;
        const actionsWidth = this._tabActionsElement?.offsetWidth || 0;
        const titleWidth = this._tabListElement?.querySelector('[data-tab-navigation-title]')?.offsetWidth || 0;
        const addButtonWidth = this._tabListElement?.querySelector('[data-tab-navigation-add]')?.offsetWidth || 0;
        return tabListWidth - actionsWidth - titleWidth - addButtonWidth;
    }

    setOverflowState(visibleTabIds, overflowTabIds) {
        const nextVisible = visibleTabIds.join(',');
        const nextOverflow = overflowTabIds.join(',');
        const currentVisible = (this.visibleTabIds || []).join(',');
        const currentOverflow = this.overflowTabIds.join(',');

        if (nextVisible === currentVisible && nextOverflow === currentOverflow) return;

        this._isRecalculating = true;
        this.visibleTabIds = visibleTabIds;
        this.overflowTabIds = overflowTabIds;
        next(() => {
            this._isRecalculating = false;
        });
    }

    @action handleKeyDown(tab, event) {
        const { key } = event;
        const currentIndex = this.args.tabs.findIndex((t) => t.id === tab.id);

        let targetIndex = currentIndex;

        switch (key) {
            case 'ArrowLeft':
                event.preventDefault();
                targetIndex = currentIndex > 0 ? currentIndex - 1 : this.args.tabs.length - 1;
                break;
            case 'ArrowRight':
                event.preventDefault();
                targetIndex = currentIndex < this.args.tabs.length - 1 ? currentIndex + 1 : 0;
                break;
            case 'Home':
                event.preventDefault();
                targetIndex = 0;
                break;
            case 'End':
                event.preventDefault();
                targetIndex = this.args.tabs.length - 1;
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                this.selectTab(tab);
                return;
            default:
                return;
        }

        const targetTab = this.args.tabs[targetIndex];
        if (targetTab && !targetTab.disabled) {
            // Focus the target tab
            const targetElement = document.querySelector(`[data-tab-id="${targetTab.id}"]`);
            if (targetElement) {
                targetElement.focus();
            }
        }
    }
}
