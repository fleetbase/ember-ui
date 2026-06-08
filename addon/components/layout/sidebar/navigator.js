import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class LayoutSidebarNavigatorComponent extends Component {
    @service router;
    @service('sidebar-navigator') sidebarNavigator;
    @tracked query = '';
    @tracked viewStack = [];

    constructor() {
        super(...arguments);
        this.syncViewStackToRoute();
        this.router.on('routeDidChange', this.syncViewStackToRoute);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.router.off('routeDidChange', this.syncViewStackToRoute);
    }

    get items() {
        return this.sidebarNavigator.normalizeItems(this.args.items ?? []);
    }

    get currentItems() {
        return this.currentParent?.children ?? this.items;
    }

    get currentParent() {
        return this.viewStack[this.viewStack.length - 1];
    }

    get title() {
        return this.currentParent?.label ?? this.currentParent?.title;
    }

    get isNested() {
        return this.viewStack.length > 0;
    }

    get hasQuery() {
        return this.query.trim().length > 0;
    }

    get searchResults() {
        return this.sidebarNavigator.searchItems(this.items, this.query);
    }

    get emptySearch() {
        return this.hasQuery && this.searchResults.length === 0;
    }

    @action syncViewStackToRoute() {
        const activePath = this.sidebarNavigator.activePath(this.items);

        if (activePath.length > 1) {
            this.viewStack = activePath.slice(0, -1);
        }
    }

    @action updateQuery(event) {
        this.query = event.target.value;
    }

    @action clearQuery() {
        this.query = '';
    }

    @action openItem(item) {
        if (item.children?.length) {
            this.query = '';
            this.viewStack = [...this.viewStack, item];
            return;
        }

        this.transitionItem(item);
    }

    @action openSearchResult(result) {
        const item = result.item;

        this.query = '';

        if (item.children?.length) {
            this.viewStack = result.path;
            return;
        }

        this.viewStack = result.path.slice(0, -1);
        this.transitionItem(item);
    }

    @action back() {
        this.query = '';
        this.viewStack = this.viewStack.slice(0, -1);
    }

    @action transitionItem(item) {
        if (typeof item.onClick === 'function') {
            item.onClick(item);
            return;
        }

        if (item.url) {
            if (item.target) {
                window.open(item.url, item.target);
                return;
            }

            window.location.href = item.url;
            return;
        }

        if (item.route) {
            this.router.transitionTo(item.route, ...(item.models ?? []));
        }
    }

    @action handleKeydown(event) {
        if (event.key !== 'Escape') {
            return;
        }

        if (this.hasQuery) {
            this.clearQuery();
            return;
        }

        if (this.isNested) {
            this.back();
        }
    }

    isActive = (item) => {
        return this.sidebarNavigator.isActive(item);
    };

    isParentActive = (item) => {
        return this.sidebarNavigator.activePath([item]).length > 0;
    };

    breadcrumb = (path) => {
        return this.sidebarNavigator.breadcrumb(path);
    };
}
