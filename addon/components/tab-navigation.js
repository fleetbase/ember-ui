import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { next } from '@ember/runloop';

export default class TabNavigationComponent extends Component {
    @tracked _activeTabId = null;

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

        return this.args.tabs.map((tab) => ({
            ...tab,
            isActive: tab.id === this._activeTabId,
            isDisabled: !!tab.disabled,
            hasIcon: !!tab.icon,
            hasBadge: !!(tab.badge && tab.badge > 0),
            isClosable: !!(tab.closable && this.args.onClose),
            badgeText: tab.badge > 99 ? '99+' : String(tab.badge || ''),
        }));
    }

    @action selectTab(tab) {
        if (tab.disabled) return;

        this._activeTabId = tab.id;
        if (this.args.onTabChange) {
            this.args.onTabChange(tab);
        }
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
