import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { getOwner } from '@ember/application';

export default class LayoutSidebarNavigatorComponent extends Component {
    @service('sidebar-navigator') sidebarNavigator;
    @tracked query = '';
    @tracked viewStack = [];
    @tracked outgoingView = null;
    @tracked transitionDirection = 'forward';
    @tracked isSearchOpen = false;
    @tracked searchState = 'idle';
    @tracked isSearching = false;
    @tracked providerResults = [];
    @tracked popoverStyle = '';
    @tracked popoverTarget = null;
    @tracked activeSearchIndex = 0;

    searchInputNode;
    portalSearchInputNode;
    searchWrapNode;
    searchResultsNode;
    viewportNode;
    transitionTimer;
    closeSearchTimer;
    openSearchTimer;
    openSearchFrame;
    searchToken = 0;

    constructor() {
        super(...arguments);
        this.syncViewStackToRoute();
        this.router?.on?.('routeDidChange', this.syncViewStackToRoute);

        if (typeof document !== 'undefined' && this.searchShortcutEnabled) {
            document.addEventListener('keydown', this.handleDocumentKeydown);
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('resize', this.updatePopoverPosition);
        }
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.router?.off?.('routeDidChange', this.syncViewStackToRoute);
        if (typeof document !== 'undefined') {
            document.removeEventListener('keydown', this.handleDocumentKeydown);
        }

        if (typeof window !== 'undefined') {
            window.clearTimeout(this.transitionTimer);
            window.clearTimeout(this.closeSearchTimer);
            window.clearTimeout(this.openSearchTimer);
            window.cancelAnimationFrame(this.openSearchFrame);
            window.removeEventListener('resize', this.updatePopoverPosition);
        }

        this.destroyPopoverTarget();
    }

    get router() {
        return this.lookupService('router') ?? this.lookupService('host-router');
    }

    lookupService(name) {
        try {
            return getOwner(this).lookup(`service:${name}`);
        } catch (_) {
            return null;
        }
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

    get searchShortcutEnabled() {
        return this.args.enableSearchShortcut !== false;
    }

    get shortcutLabel() {
        return typeof navigator !== 'undefined' && navigator.platform?.toLowerCase().includes('mac') ? 'Cmd K' : 'Ctrl K';
    }

    get hasSearchPopover() {
        return this.isSearchOpen;
    }

    get searchResults() {
        return [...this.staticSearchResults, ...this.providerResults];
    }

    get limitedSearchResults() {
        return this.searchResults.slice(0, this.maxSearchResults);
    }

    get hasSearchResults() {
        return this.limitedSearchResults.length > 0;
    }

    get maxSearchResults() {
        return Number(this.args.maxSearchResults) || 12;
    }

    get searchVisualHidden() {
        return this.hasSearchPopover || this.searchState === 'closing';
    }

    get searchPopoverClass() {
        return `next-sidebar-navigator-search-popover is-${this.searchState}`;
    }

    get searchOverlayClass() {
        return `next-sidebar-navigator-search-overlay is-${this.searchState}`;
    }

    get staticSearchResults() {
        return this.sidebarNavigator.searchItems(this.items, this.query).map((result) => {
            return {
                ...result.item,
                item: result.item,
                path: result.path,
                label: result.item.label ?? result.item.title,
                description: result.item.description,
                breadcrumb: this.breadcrumb(result.path),
                type: 'Navigation',
            };
        });
    }

    get emptySearch() {
        return this.hasQuery && !this.isSearching && this.searchResults.length === 0;
    }

    @action syncViewStackToRoute() {
        const activePath = this.sidebarNavigator.activePath(this.items);

        if (activePath.length > 1) {
            this.viewStack = activePath.slice(0, -1);
        }
    }

    @action registerSearchInput(inputNode) {
        this.searchInputNode = inputNode;
    }

    @action registerPortalSearchInput(inputNode) {
        this.portalSearchInputNode = inputNode;
        inputNode?.focus();
    }

    @action registerSearchWrap(searchWrapNode) {
        this.searchWrapNode = searchWrapNode;
        this.updatePopoverPosition();
    }

    @action registerViewport(viewportNode) {
        this.viewportNode = viewportNode;
    }

    @action registerSearchResults(searchResultsNode) {
        this.searchResultsNode = searchResultsNode;
    }

    @action updateQuery(event) {
        this.query = event.target.value;
        this.openSearch();
        this.activeSearchIndex = 0;
        this.searchProvider();
    }

    @action clearQuery() {
        this.query = '';
        this.providerResults = [];
        this.isSearching = false;
        this.activeSearchIndex = 0;
        this.searchToken++;
        this.portalSearchInputNode?.focus();
    }

    @action openSearch() {
        if (this.hasSearchPopover && this.searchState !== 'closing') {
            this.updatePopoverPosition();
            return;
        }

        window.clearTimeout(this.closeSearchTimer);
        window.clearTimeout(this.openSearchTimer);
        window.cancelAnimationFrame(this.openSearchFrame);
        this.ensurePopoverTarget();
        this.searchState = this.reducedMotion ? 'open' : 'primed';
        this.isSearchOpen = true;
        this.updatePopoverPosition();
        this.activeSearchIndex = 0;

        this.openSearchFrame = window.requestAnimationFrame(() => {
            if (this.searchState === 'primed') {
                this.searchState = 'opening';
            }

            this.portalSearchInputNode?.focus();
        });

        if (!this.reducedMotion) {
            this.openSearchTimer = window.setTimeout(() => {
                if (this.searchState === 'opening') {
                    this.searchState = 'open';
                }
            }, 180);
        }
    }

    @action closeSearch() {
        if (!this.hasSearchPopover) {
            return;
        }

        window.clearTimeout(this.closeSearchTimer);
        window.clearTimeout(this.openSearchTimer);
        window.cancelAnimationFrame(this.openSearchFrame);
        this.updatePopoverPosition();
        this.searchState = this.reducedMotion ? 'idle' : 'closing';
        this.portalSearchInputNode?.blur();

        const close = () => {
            this.isSearchOpen = false;
            this.searchState = 'idle';
            this.destroyPopoverTarget();
        };

        if (this.reducedMotion) {
            close();
            return;
        }

        this.closeSearchTimer = window.setTimeout(close, 160);
    }

    @action openItem(item) {
        if (item.children?.length) {
            this.query = '';
            this.transitionToStack([...this.viewStack, item], 'forward');
            return;
        }

        this.transitionItem(item);
    }

    @action openSearchResult(result) {
        const item = result.item ?? result;

        this.query = '';
        this.providerResults = [];
        this.activeSearchIndex = 0;
        this.closeSearch();

        if (item.children?.length) {
            this.transitionToStack(result.path ?? [...this.viewStack, item], 'forward');
            return;
        }

        if (result.path) {
            this.transitionToStack(result.path.slice(0, -1), 'forward');
        }

        this.transitionItem(item);
    }

    @action back() {
        this.query = '';
        this.transitionToStack(this.viewStack.slice(0, -1), 'back');
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

        if (item.route && this.router) {
            if (item.queryParams) {
                this.router.transitionTo(item.route, ...(item.models ?? []), { queryParams: item.queryParams });
                return;
            }

            this.router.transitionTo(item.route, ...(item.models ?? []));
        }
    }

    @action handleKeydown(event) {
        if (event.key !== 'Escape') {
            return;
        }

        if (this.hasSearchPopover) {
            this.closeSearch();
            return;
        }

        if (this.isNested) {
            this.back();
        }
    }

    @action handleDocumentKeydown(event) {
        if (!(event.key?.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey))) {
            return;
        }

        event.preventDefault();
        this.openSearch();
        this.searchInputNode?.focus();
    }

    @action handleSearchPanelKeydown(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            this.closeSearch();
            return;
        }

        if (!this.hasSearchResults) {
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.setActiveSearchIndex(Math.min(this.activeSearchIndex + 1, this.limitedSearchResults.length - 1));
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.setActiveSearchIndex(Math.max(this.activeSearchIndex - 1, 0));
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            this.openActiveSearchResult();
        }
    }

    @action setActiveSearchIndex(index) {
        this.activeSearchIndex = index;
        this.scrollActiveResultIntoView();
    }

    @action openActiveSearchResult() {
        const result = this.limitedSearchResults[this.activeSearchIndex];

        if (result) {
            this.openSearchResult(result);
        }
    }

    @action updatePopoverPosition() {
        if (!this.isSearchOpen || !this.searchWrapNode || typeof window === 'undefined') {
            return;
        }

        const rect = this.searchWrapNode.getBoundingClientRect();
        const viewportPadding = 12;
        const targetWidth = 440;
        const maxWidth = Math.max(260, window.innerWidth - viewportPadding * 2);
        const width = Math.min(targetWidth, maxWidth);
        const left = Math.min(Math.max(rect.left, viewportPadding), window.innerWidth - width - viewportPadding);
        const top = rect.top;
        const sourceScale = rect.width / width;
        const sourceTranslateX = rect.left - left;

        this.popoverStyle = `position: fixed; top: ${top}px; left: ${left}px; width: ${width}px; --search-source-x: ${sourceTranslateX}px; --search-source-scale: ${sourceScale};`;
    }

    ensurePopoverTarget() {
        if (this.popoverTarget || typeof document === 'undefined') {
            return;
        }

        const root = document.getElementById('application-root-wormhole') ?? document.body;
        const target = document.createElement('div');

        target.className = 'next-sidebar-navigator-search-portal';
        root.appendChild(target);
        this.popoverTarget = target;
    }

    destroyPopoverTarget() {
        this.popoverTarget?.remove();
        this.popoverTarget = null;
        this.portalSearchInputNode = null;
        this.searchResultsNode = null;
    }

    transitionToStack(nextStack, direction) {
        window.clearTimeout(this.transitionTimer);

        if (this.viewportNode) {
            this.viewportNode.style.setProperty('--next-sidebar-navigator-transition-height', `${this.viewportNode.scrollHeight}px`);
        }

        this.outgoingView = {
            items: this.currentItems,
            parent: this.currentParent,
        };
        this.transitionDirection = direction;
        this.viewStack = nextStack;
        this.transitionTimer = window.setTimeout(() => {
            this.outgoingView = null;
            this.viewportNode?.style.removeProperty('--next-sidebar-navigator-transition-height');
        }, 220);
    }

    searchProvider() {
        const provider = this.args.searchProvider;
        const query = this.query.trim();
        const token = ++this.searchToken;

        if (typeof provider !== 'function' || !query) {
            this.providerResults = [];
            this.isSearching = false;
            return;
        }

        this.isSearching = true;

        let providerResults;

        try {
            providerResults = provider({ query, items: this.items, limit: this.maxSearchResults });
        } catch (_) {
            this.providerResults = [];
            this.isSearching = false;
            return;
        }

        Promise.resolve(providerResults)
            .then((results = []) => {
                if (token !== this.searchToken) {
                    return;
                }

                this.providerResults = this.sidebarNavigator.normalizeSearchResults(results);
                this.activeSearchIndex = Math.min(this.activeSearchIndex, Math.max(this.limitedSearchResults.length - 1, 0));
            })
            .catch(() => {
                if (token === this.searchToken) {
                    this.providerResults = [];
                }
            })
            .finally(() => {
                if (token === this.searchToken) {
                    this.isSearching = false;
                }
            });
    }

    scrollActiveResultIntoView() {
        window.requestAnimationFrame(() => {
            const activeResult = this.searchResultsNode?.querySelector(`[data-search-result-index="${this.activeSearchIndex}"]`);
            activeResult?.scrollIntoView({ block: 'nearest' });
        });
    }

    itemDescriptionVisible = (item) => {
        return Boolean(item?.showDescription && item?.description);
    };

    tooltipFor = (item) => {
        if (typeof item?.tooltip === 'string') {
            return item.tooltip;
        }

        if (item?.tooltip === true) {
            return item.description;
        }

        return null;
    };

    isActive = (item) => {
        return this.sidebarNavigator.isActive(item);
    };

    isParentActive = (item) => {
        return this.sidebarNavigator.activePath([item]).length > 0;
    };

    breadcrumb = (path) => {
        return this.sidebarNavigator.breadcrumb(path);
    };

    reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
