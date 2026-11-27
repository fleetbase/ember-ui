import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { guidFor } from '@ember/object/internals';
import { activateItem, hasCommandModifier, hasMethod, modulePages } from '../utils/shell';

/**
 * The built-in provider: modules from the header menu and the pages each one
 * registers for its dock flyout.
 */
export function navigationProvider(universe) {
    return {
        id: 'navigation',
        label: 'Pages',
        icon: 'compass',
        search(query) {
            const needle = query.toLowerCase();
            const results = [];
            for (const module of universe.headerMenuItems.filter((item) => !item._isShortcut)) {
                if (String(module.title).toLowerCase().includes(needle)) {
                    results.push({ ...module, id: `module:${module.id}`, title: module.title, subtitle: 'Module', group: 'Modules' });
                }
                for (const group of modulePages(universe, module.id)) {
                    for (const page of group.items) {
                        if (String(page.title).toLowerCase().includes(needle)) {
                            results.push({ ...page, id: `page:${module.id}:${page.title}`, title: page.title, subtitle: module.title, group: 'Pages' });
                        }
                    }
                }
            }
            return results;
        },
    };
}

/**
 * `<CommandPalette />` — the global ⌘K (Ctrl+K) search and command palette.
 *
 * Mount it once in the canvas shell. It searches every provider registered with
 * ember-core (`universe.getSearchProviders()` →
 * `[{ id, label, icon, search(query) → Promise<results> }]`) plus a built-in
 * provider of modules and their pages (`@includeNavigation={{false}}` drops
 * it). `@providers` replaces the registered providers.
 *
 * A result is `{ id, title, subtitle, group, route?, models?, query?, action? }`.
 * Results are grouped by `group`, else by their provider's label. Choosing one
 * runs its `action`, or transitions to its route, and closes the palette.
 *
 * Keyboard: ⌘K toggles; ↑/↓ move through results; Enter opens; Tab and
 * Shift+Tab move between the scope chips (All, then one per provider); Escape
 * closes. A provider that throws or rejects is skipped, and a slower, older
 * search never replaces the results of a newer one.
 *
 * While a palette is mounted it owns ⌘K (see the `command-palette` service);
 * `Layout::Sidebar::Navigator` then leaves the shortcut alone.
 */
export default class CommandPaletteComponent extends Component {
    @service commandPalette;
    @service universe;
    @service router;

    @tracked query = '';
    @tracked results = [];
    // Set by setup() when the dialog opens; nothing reads it while there are no results.
    @tracked activeIndex;
    @tracked isSearching = false;

    id = guidFor(this);
    searchToken = 0;
    unregister = null;
    restoreFocus = null;

    constructor() {
        super(...arguments);
        this.unregister = this.commandPalette.register();
        document.addEventListener('keydown', this.onDocumentKeydown);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.unregister();
        document.removeEventListener('keydown', this.onDocumentKeydown);
    }

    get isOpen() {
        return this.commandPalette.isOpen;
    }

    get listboxId() {
        return `${this.id}-results`;
    }

    get providers() {
        const registered = this.args.providers || (hasMethod(this.universe, 'getSearchProviders') ? this.universe.getSearchProviders() : null) || [];
        return this.args.includeNavigation === false ? registered : [navigationProvider(this.universe), ...registered];
    }

    get scopes() {
        const scope = this.commandPalette.scope;
        return [
            { id: null, label: 'All', isSelected: !this.scopedProvider },
            ...this.providers.map((provider) => ({ id: provider.id, label: provider.label, icon: provider.icon, isSelected: provider.id === scope })),
        ];
    }

    /** The provider the palette is scoped to, or null for all of them. */
    get scopedProvider() {
        return this.providers.find((provider) => provider.id === this.commandPalette.scope) || null;
    }

    get searchedProviders() {
        const scoped = this.scopedProvider;
        return scoped ? [scoped] : this.providers;
    }

    /** Results grouped for display; each option keeps its index in the flat list. */
    get groups() {
        const groups = [];
        const byName = new Map();
        this.results.forEach((result, index) => {
            const name = result.group || result.provider.label;
            if (!byName.has(name)) {
                byName.set(name, { name, options: [] });
                groups.push(byName.get(name));
            }
            byName.get(name).options.push({ result, index, id: `${this.id}-option-${index}`, isActive: index === this.activeIndex });
        });
        return groups;
    }

    get activeOptionId() {
        return this.results.length ? `${this.id}-option-${this.activeIndex}` : null;
    }

    get hasQuery() {
        return this.query.trim().length > 0;
    }

    get isEmpty() {
        return this.hasQuery && !this.isSearching && this.results.length === 0;
    }

    @action onDocumentKeydown(event) {
        if (event.key.toLowerCase() === 'k' && hasCommandModifier(event)) {
            event.preventDefault();
            if (this.isOpen) {
                this.close();
            } else {
                this.restoreFocus = document.activeElement;
                this.commandPalette.open();
            }
        }
    }

    @action setup(element) {
        this.query = '';
        this.results = [];
        this.activeIndex = 0;
        element.querySelector('.fb-command-palette-input').focus();
    }

    @action close() {
        this.searchToken++;
        this.commandPalette.close();
        if (this.restoreFocus && document.body.contains(this.restoreFocus)) {
            this.restoreFocus.focus();
        }
        this.restoreFocus = null;
    }

    @action onInput(event) {
        this.query = event.target.value;
        return this.search();
    }

    @action selectScope(scopeId) {
        this.commandPalette.scope = scopeId;
        return this.search();
    }

    /**
     * Runs the query against the providers in scope. Returns a promise that
     * settles once these results are shown (or discarded as stale).
     */
    async search() {
        const token = ++this.searchToken;
        const query = this.query.trim();
        if (!query) {
            this.results = [];
            this.isSearching = false;
            return;
        }

        const providers = this.searchedProviders;
        this.isSearching = true;
        const settled = await Promise.allSettled(providers.map((provider) => Promise.resolve().then(() => provider.search(query))));
        if (token !== this.searchToken) {
            return;
        }

        this.results = settled.flatMap((outcome, index) => {
            if (outcome.status !== 'fulfilled' || !Array.isArray(outcome.value)) {
                return [];
            }
            return outcome.value.map((result) => ({ ...result, provider: providers[index] }));
        });
        this.activeIndex = 0;
        this.isSearching = false;
    }

    @action activate(result) {
        const { provider, ...item } = result;
        this.close();
        return activateItem(this.router, { ...item, providerId: provider.id });
    }

    @action highlight(index) {
        this.activeIndex = index;
    }

    cycleScope(step) {
        const scopes = this.scopes;
        const current = scopes.findIndex((scope) => scope.isSelected);
        return this.selectScope(scopes[(current + step + scopes.length) % scopes.length].id);
    }

    @action onKeydown(event) {
        const count = this.results.length;
        switch (event.key) {
            case 'Escape':
                event.preventDefault();
                event.stopPropagation();
                this.close();
                break;
            case 'ArrowDown':
            case 'ArrowUp':
                event.preventDefault();
                if (count) {
                    this.activeIndex = (this.activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + count) % count;
                }
                break;
            case 'Enter':
                event.preventDefault();
                if (count) {
                    this.activate(this.results[this.activeIndex]);
                }
                break;
            case 'Tab':
                event.preventDefault();
                this.cycleScope(event.shiftKey ? -1 : 1);
                break;
        }
    }
}
