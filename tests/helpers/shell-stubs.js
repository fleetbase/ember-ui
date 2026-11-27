import Service from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { hbs } from 'ember-cli-htmlbars';

/**
 * Stubs for the services the canvas shell's navigation chrome reads.
 *
 * `dock` and `context-bar` are being added to ember-core alongside these
 * components; ember-ui depends on a published ember-core that may not have
 * them, so the tests register these stubs (and test the fallbacks by leaving
 * them out). The router is stubbed so navigation can be observed without the
 * dummy app having the console's routes.
 */
export class RouterStub extends Service {
    @tracked currentRouteName = 'console.home';
    @tracked currentRoute = { queryParams: {} };
    transitions = [];

    transitionTo(...args) {
        this.transitions.push(args);
        return Promise.resolve();
    }

    on() {}
    off() {}
}

export const DOCK_MODULES = [
    { id: 'fleet-ops', title: 'Fleet-Ops', icon: 'route', route: 'console.fleet-ops', color: '#3b82f6', status: { tone: 'warn', text: '2 stale GPS' }, badge: 2 },
    { id: 'storefront', title: 'Storefront', icon: 'store', route: 'console.storefront', color: '#38bdf8' },
    { id: 'ledger', title: 'Ledger', icon: 'book', route: 'console.ledger', status: { tone: 'error', text: '2 invoices overdue' } },
];

export const HIDDEN_MODULES = [
    { id: 'pallet', title: 'Pallet', icon: 'box', route: 'console.pallet' },
    { id: 'iam', title: 'IAM', route: 'console.iam' },
];

export class DockStub extends Service {
    @tracked items = DOCK_MODULES.map((item) => ({ ...item }));
    @tracked hiddenItems = HIDDEN_MODULES.map((item) => ({ ...item }));
    @tracked lockedIds = [];
    canManageRoles = false;
    roles = [];
    calls = [];
    defaultsByRole = {};

    get all() {
        return [...this.items, ...this.hiddenItems];
    }

    reorder(ids) {
        this.calls.push(['reorder', ids]);
        const all = this.all;
        this.items = ids.map((id) => all.find((item) => item.id === id));
        this.hiddenItems = all.filter((item) => !ids.includes(item.id));
    }

    hide(id) {
        this.calls.push(['hide', id]);
    }

    show(id) {
        this.calls.push(['show', id]);
    }

    roleDefaults(roleId) {
        return this.defaultsByRole[roleId];
    }

    setRoleDefaults(roleId, defaults) {
        this.calls.push(['setRoleDefaults', roleId, defaults]);
    }
}

export class ContextBarStub extends Service {
    @tracked crumbs = [];
    @tracked chips = [];

    setCrumbs(crumbs) {
        this.crumbs = crumbs;
    }

    setChips(chips) {
        this.chips = chips;
    }

    clear() {
        this.crumbs = [];
        this.chips = [];
    }
}

/**
 * ember-core's `backdrop` service, reduced to what the canvas host reads:
 * `active`, `mounted` and `state`. Tests set `registrations` and pick the
 * active one with `activate(name)` (or `activate(null)` for the dot grid);
 * keep-alive registrations stay in `mounted` once activated, as in ember-core.
 */
export class BackdropStub extends Service {
    @tracked registrations = [];
    @tracked activeName = null;
    @tracked activated = [];
    @tracked state = { layers: [], fitBounds: null, focus: null, mode: null };
    requests = new Map();

    get active() {
        return this.registrations.find((registration) => registration?.name === this.activeName) ?? null;
    }

    get mounted() {
        return this.registrations.filter((registration) => registration?.name === this.activeName || (registration?.keepAlive && this.activated.includes(registration.name)));
    }

    activate(name) {
        this.activeName = name;
        if (name && !this.activated.includes(name)) {
            this.activated = [...this.activated, name];
        }
    }

    request(owner, options = {}) {
        this.requests.set(owner, options);
        this.state = { ...this.state, layers: [...this.requests].map(([key, value]) => ({ owner: key, layers: value.layers ?? [] })) };
    }

    release(owner) {
        return this.requests.delete(owner);
    }
}

// <LinkToExternal> only resolves inside a mounted engine, so it is stubbed at that boundary.
class LinkToExternalStub extends Component {}
const LINK_TO_EXTERNAL_TEMPLATE = hbs`<a href="javascript:;" data-test-route={{@route}} ...attributes>{{yield}}</a>`;

/**
 * Registers the router stub and `<LinkToExternal>`; `options.dock` and
 * `options.contextBar` also register those service stubs.
 */
export function setupShellStubs(hooks, { dock = false, contextBar = false } = {}) {
    hooks.beforeEach(function () {
        this.owner.unregister('service:router');
        this.owner.register('service:router', RouterStub);
        this.owner.register('component:link-to-external', LinkToExternalStub);
        this.owner.register('template:components/link-to-external', LINK_TO_EXTERNAL_TEMPLATE);
        if (dock) {
            this.owner.unregister('service:dock');
            this.owner.register('service:dock', DockStub);
        }
        if (contextBar) {
            this.owner.unregister('service:context-bar');
            this.owner.register('service:context-bar', ContextBarStub);
        }
        this.router = this.owner.lookup('service:router');
    });
}

/**
 * Makes the universe menu service answer for `engine:<id>` registries with the
 * given panels and loose items, keyed by module id.
 */
export function stubModulePages(owner, { panels = {}, items = {} } = {}) {
    const menuService = owner.lookup('service:universe').menuService;
    menuService.getMenuPanels = (registry) => panels[registry.replace('engine:', '')] || [];
    menuService.getMenuItems = (registry) => items[registry.replace('engine:', '')] || [];
    return menuService;
}

/** Makes `universe.headerMenuItems` (a getter in ember-core) return `items`. */
export function stubHeaderMenuItems(owner, items) {
    const universe = owner.lookup('service:universe');
    Object.defineProperty(universe, 'headerMenuItems', { configurable: true, get: () => items });
    return universe;
}
