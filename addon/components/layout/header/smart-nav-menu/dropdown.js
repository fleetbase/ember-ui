import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { htmlSafe } from '@ember/template';

/**
 * Layout::Header::SmartNavMenu::Dropdown
 *
 * Phase 2: multi-column card grid + search filter.
 */
export default class LayoutHeaderSmartNavMenuDropdownComponent extends Component {
    @tracked searchQuery = '';

    get positionStyle() {
        const top = this.args.top ?? 0;
        const left = this.args.left ?? 0;
        return htmlSafe('top: ' + top + 'px; left: ' + left + 'px;');
    }

    get filteredItems() {
        const query = (this.searchQuery || '').trim().toLowerCase();
        const items = this.args.items ?? [];
        if (!query) {
            return items;
        }
        return items.filter((item) => {
            if ((item.title || '').toLowerCase().includes(query)) return true;
            if (item.description && item.description.toLowerCase().includes(query)) return true;
            if (Array.isArray(item.shortcuts)) {
                return item.shortcuts.some((sc) => (sc.title || '').toLowerCase().includes(query));
            }
            return false;
        });
    }

    get hasNoResults() {
        return this.searchQuery.trim().length > 0 && this.filteredItems.length === 0;
    }

    @action updateSearch(event) {
        this.searchQuery = event.target.value;
    }

    @action clearSearch() {
        this.searchQuery = '';
    }

    @action handleItemClick(menuItem, event) {
        event?.preventDefault();
        if (menuItem && typeof menuItem.onClick === 'function') {
            menuItem.onClick(menuItem);
        }
        if (typeof this.args.onClose === 'function') {
            this.args.onClose();
        }
    }

    @action handleShortcutClick() {
        if (typeof this.args.onClose === 'function') {
            this.args.onClose();
        }
    }
}
