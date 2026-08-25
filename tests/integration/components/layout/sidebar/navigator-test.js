import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { click, fillIn, render, settled, triggerEvent, triggerKeyEvent, waitFor, waitUntil } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { setupWindowMock } from 'ember-window-mock/test-support';
import window from 'ember-window-mock';

class AbilitiesStub extends Service {
    denied = new Set();
    throwFor = new Set();

    can(permission) {
        if (this.throwFor.has(permission)) {
            throw new Error(`Permission check failed for ${permission}`);
        }

        return !this.denied.has(permission);
    }

    cannot(permission) {
        return !this.can(permission);
    }
}

module('Integration | Component | layout/sidebar/navigator', function (hooks) {
    setupRenderingTest(hooks);
    setupWindowMock(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:abilities', AbilitiesStub);
        this.wormholeRoot = document.getElementById('application-root-wormhole');

        if (!this.wormholeRoot) {
            this.wormholeRoot = document.createElement('div');
            this.wormholeRoot.id = 'application-root-wormhole';
            // Mount inside the testing container, not document.body: qunit-dom scopes
            // assert.dom(selector) to the test root, so a portal appended to the body is
            // invisible to every selector-based assertion below.
            (document.getElementById('ember-testing') ?? document.body).appendChild(this.wormholeRoot);
            this.createdWormholeRoot = true;
        }

        this.set('items', [
            {
                label: 'Orders',
                description: 'Dispatch and fulfillment work.',
                icon: 'box',
                keywords: ['dispatch'],
                onClick: () => this.set('selected', 'orders'),
            },
            {
                label: 'Settings',
                description: 'Workspace configuration.',
                tooltip: true,
                icon: 'gear',
                children: [
                    {
                        label: 'Service Rates',
                        description: 'Pricing rules for operations.',
                        showDescription: true,
                        tooltip: 'Manage service pricing',
                        icon: 'file-invoice-dollar',
                        keywords: ['pricing'],
                        onClick: () => this.set('selected', 'service-rates'),
                    },
                ],
            },
        ]);
    });

    hooks.afterEach(function () {
        this.wormholeRoot?.querySelectorAll('.next-sidebar-navigator-search-portal').forEach((element) => element.remove());

        if (this.createdWormholeRoot) {
            this.wormholeRoot.remove();
        }
    });

    test('it hides items with denied visiblePermission and prunes empty branches', async function (assert) {
        const abilities = this.owner.lookup('service:abilities');
        abilities.denied.add('fleet-ops see service-rate');
        abilities.denied.add('fleet-ops see hidden-section');

        this.set('items', [
            {
                label: 'Operations',
                children: [
                    {
                        label: 'Orders',
                        visiblePermission: 'fleet-ops see order',
                        onClick: () => this.set('selected', 'orders'),
                    },
                    {
                        label: 'Service Rates',
                        visiblePermission: 'fleet-ops see service-rate',
                        permission: 'fleet-ops list service-rate',
                        keywords: ['rates'],
                        onClick: () => this.set('selected', 'service-rates'),
                    },
                ],
            },
            {
                label: 'Hidden Section',
                children: [
                    {
                        label: 'Hidden Child',
                        visiblePermission: 'fleet-ops see hidden-section',
                        onClick: () => this.set('selected', 'hidden'),
                    },
                ],
            },
        ]);

        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);

        assert.dom('.next-sidebar-navigator').includesText('Operations');
        assert.dom('.next-sidebar-navigator').doesNotIncludeText('Hidden Section');

        await click('.next-sidebar-navigator-view-in .next-sidebar-navigator-item:first-of-type');

        assert.dom('.next-sidebar-navigator').includesText('Orders');
        assert.dom('.next-sidebar-navigator').doesNotIncludeText('Service Rates');

        await fillIn('.next-sidebar-navigator-search input', 'rates');

        assert.dom('.next-sidebar-navigator-search-result').doesNotExist('hidden items are excluded from search');
    });

    test('it fails closed when an explicit permission check throws', async function (assert) {
        const abilities = this.owner.lookup('service:abilities');
        abilities.throwFor.add('fleet-ops list service-rate');

        this.set('items', [
            {
                label: 'Orders',
                onClick: () => this.set('selected', 'orders'),
            },
            {
                label: 'Service Rates',
                permission: 'fleet-ops list service-rate',
                onClick: () => this.set('selected', 'service-rates'),
            },
        ]);

        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);

        assert.dom('.next-sidebar-navigator').includesText('Orders');
        assert.dom('.next-sidebar-navigator').doesNotIncludeText('Service Rates');
    });

    test('it can require a branch to have visible non-hub children', async function (assert) {
        const abilities = this.owner.lookup('service:abilities');
        abilities.denied.add('fleet-ops see work-order');

        this.set('items', [
            {
                label: 'Maintenance',
                requiresVisibleChildren: true,
                children: [
                    {
                        label: 'Maintenance Hub',
                        isNavigationHub: true,
                        route: 'console.fleet-ops.maintenance.index',
                    },
                    {
                        label: 'Work Orders',
                        visiblePermission: 'fleet-ops see work-order',
                        route: 'console.fleet-ops.maintenance.work-orders',
                    },
                ],
            },
            {
                label: 'Regular Section',
                children: [
                    {
                        label: 'Regular Hub',
                        isNavigationHub: true,
                        route: 'console.regular.index',
                    },
                ],
            },
            {
                label: 'Resources',
                requiresVisibleChildren: true,
                children: [
                    {
                        label: 'Resources Hub',
                        isNavigationHub: true,
                        route: 'console.fleet-ops.management.index',
                    },
                    {
                        label: 'Drivers',
                        visiblePermission: 'fleet-ops see driver',
                        route: 'console.fleet-ops.management.drivers',
                    },
                ],
            },
        ]);

        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);

        assert.dom('.next-sidebar-navigator').doesNotIncludeText('Maintenance', 'hub-only required branch is hidden');
        assert.dom('.next-sidebar-navigator').includesText('Regular Section', 'normal branches keep existing behavior');
        assert.dom('.next-sidebar-navigator').includesText('Resources', 'branch with a visible real child remains visible');

        await click('.next-sidebar-navigator-view-in .next-sidebar-navigator-item:nth-of-type(2)');

        assert.dom('.next-sidebar-navigator').includesText('Resources Hub');
        assert.dom('.next-sidebar-navigator').includesText('Drivers');
    });

    test('it transitions between root and nested menus with directional classes', async function (assert) {
        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);

        assert.dom('.next-sidebar-navigator-item').exists({ count: 2 });
        assert.dom('.next-sidebar-navigator').includesText('Settings');

        await click('.next-sidebar-navigator-view-in .next-sidebar-navigator-item:nth-of-type(2)');

        assert.dom('.next-sidebar-navigator-viewport').hasClass('is-transitioning');
        assert.dom('.next-sidebar-navigator-viewport').hasClass('is-forward');
        assert.dom('.next-sidebar-navigator-view-out').includesText('Orders');
        assert.dom('.next-sidebar-navigator-back').includesText('Settings');
        assert.dom('.next-sidebar-navigator-view-in .next-sidebar-navigator-item').includesText('Service Rates');
        assert.dom('.next-sidebar-navigator-back').hasClass('next-sidebar-navigator-back');

        await click('.next-sidebar-navigator-back');

        assert.dom('.next-sidebar-navigator-viewport').hasClass('is-back');
        assert.dom('.next-sidebar-navigator-view-in').includesText('Orders');
    });

    test('it routes to a branch default route when opening nested menus', async function (assert) {
        class RouterStub extends Service {
            currentRouteName = 'console.orders';
            currentURL = '/orders';

            transitionTo(route, ...args) {
                assert.strictEqual(route, 'console.settings.index');
                assert.deepEqual(args, [{ queryParams: { section: 'general' } }]);
            }
        }

        this.owner.register('service:router', RouterStub);
        this.set('items', [
            {
                label: 'Settings',
                defaultRoute: 'console.settings.index',
                defaultQueryParams: { section: 'general' },
                children: [
                    {
                        label: 'General',
                        route: 'console.settings.index',
                    },
                ],
            },
        ]);

        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
        await click('.next-sidebar-navigator-view-in .next-sidebar-navigator-item');

        assert.dom('.next-sidebar-navigator-back').includesText('Settings');
    });

    test('it uses item activeWhen callbacks for nested route sync and active state', async function (assert) {
        class RouterStub extends Service {
            currentRouteName = 'console.virtual';
            currentURL = '/fleet-ops/management/contracts';

            on() {}
            off() {}
        }

        this.owner.register('service:router', RouterStub);
        this.set('items', [
            {
                label: 'Resources',
                children: [
                    {
                        label: 'Contracts',
                        activeWhen: ({ routeName, currentURL }) => routeName === 'console.virtual' && currentURL === '/fleet-ops/management/contracts',
                        onClick: () => this.set('selected', 'contracts'),
                    },
                ],
            },
            {
                label: 'Settings',
                route: 'console.settings',
            },
        ]);

        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);

        assert.dom('.next-sidebar-navigator-back').includesText('Resources');
        assert.dom('.next-sidebar-navigator-view-in .next-sidebar-navigator-item').includesText('Contracts');
        assert.dom('.next-sidebar-navigator-view-in .next-sidebar-navigator-item').hasClass('is-active');
    });

    test('it lets an initial active parent predicate suppress initial nested sync once', async function (assert) {
        class RouterStub extends Service {
            currentRouteName = 'console.settings.index';
            currentURL = '/settings';
            handler;

            on(eventName, handler) {
                if (eventName === 'routeDidChange') {
                    this.handler = handler;
                }
            }

            off() {}

            triggerRouteDidChange() {
                this.handler?.();
            }
        }

        this.owner.register('service:router', RouterStub);
        this.set('items', [
            {
                label: 'Settings',
                children: [
                    {
                        label: 'General',
                        route: 'console.settings.index',
                    },
                ],
            },
        ]);
        const syncCalls = [];
        this.set('shouldSyncInitialActiveParent', ({ activePath, routeName, currentURL }) => {
            syncCalls.push({ labels: activePath.map((item) => item.label), routeName, currentURL });

            return routeName !== 'console.settings.index';
        });

        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} @shouldSyncInitialActiveParent={{this.shouldSyncInitialActiveParent}} />`);

        assert.dom('.next-sidebar-navigator-back').doesNotExist('initial render stays at root when predicate returns false');
        assert.dom('.next-sidebar-navigator-view-in').includesText('Settings');

        // Asserted outside the predicate: inside it, a change to the routeName would have skipped
        // the branch and quietly asserted nothing.
        const settingsCall = syncCalls.find((call) => call.routeName === 'console.settings.index');
        assert.ok(settingsCall, 'the predicate is consulted for the active route');
        assert.deepEqual(settingsCall.labels, ['Settings', 'General'], 'it receives the full active path');
        assert.strictEqual(settingsCall.currentURL, '/settings', 'and the current url');

        const router = this.owner.lookup('service:router');
        router.currentRouteName = 'console.settings.security';
        router.currentURL = '/settings/security';
        this.set('items', [
            {
                label: 'Settings',
                children: [
                    {
                        label: 'General',
                        route: 'console.settings.index',
                    },
                    {
                        label: 'Security',
                        route: 'console.settings.security',
                    },
                ],
            },
        ]);
        router.triggerRouteDidChange();
        await settled();

        assert.dom('.next-sidebar-navigator-back').includesText('Settings', 'later route changes sync nested state normally');
        assert.dom('.next-sidebar-navigator-view-in').includesText('General');
        assert.dom('.next-sidebar-navigator-view-in').includesText('Security');
    });

    test('it syncs initial nested state when the active parent predicate allows it', async function (assert) {
        class RouterStub extends Service {
            currentRouteName = 'console.settings.index';
            currentURL = '/settings';

            on() {}
            off() {}
        }

        this.owner.register('service:router', RouterStub);
        this.set('items', [
            {
                label: 'Settings',
                children: [
                    {
                        label: 'General',
                        route: 'console.settings.index',
                    },
                ],
            },
        ]);
        this.set('shouldSyncInitialActiveParent', () => true);

        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} @shouldSyncInitialActiveParent={{this.shouldSyncInitialActiveParent}} />`);

        assert.dom('.next-sidebar-navigator-back').includesText('Settings');
        assert.dom('.next-sidebar-navigator-view-in .next-sidebar-navigator-item').includesText('General');
    });

    test('it keeps the existing initialActiveParentSync false opt-out', async function (assert) {
        class RouterStub extends Service {
            currentRouteName = 'console.settings.index';
            currentURL = '/settings';

            on() {}
            off() {}
        }

        this.owner.register('service:router', RouterStub);
        this.set('items', [
            {
                label: 'Settings',
                children: [
                    {
                        label: 'General',
                        route: 'console.settings.index',
                    },
                ],
            },
        ]);
        this.set('shouldSyncInitialActiveParent', () => true);

        await render(hbs`
            <Layout::Sidebar::Navigator
                @items={{this.items}}
                @initialActiveParentSync={{false}}
                @shouldSyncInitialActiveParent={{this.shouldSyncInitialActiveParent}}
            />
        `);

        assert.dom('.next-sidebar-navigator-back').doesNotExist();
        assert.dom('.next-sidebar-navigator-view-in').includesText('Settings');
    });

    test('it yields nested footer state', async function (assert) {
        await render(hbs`
            <Layout::Sidebar::Navigator @items={{this.items}}>
                <:footer as |state|>
                    <div class="test-navigator-footer">
                        {{if state.isNested state.currentParent.label "Root"}}
                    </div>
                </:footer>
            </Layout::Sidebar::Navigator>
        `);

        assert.dom('.test-navigator-footer').hasText('Root');

        await click('.next-sidebar-navigator-view-in .next-sidebar-navigator-item:nth-of-type(2)');

        assert.dom('.test-navigator-footer').hasText('Settings');
    });

    test('it applies primary action custom classes and visibility', async function (assert) {
        this.set('primaryAction', {
            label: 'Create Order',
            buttonClass: 'fleet-ops-sidebar-primary-action',
            onClick: () => assert.step('primary-action'),
        });

        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} @primaryAction={{this.primaryAction}} />`);

        assert.dom('.next-sidebar-navigator-primary-action').hasClass('fleet-ops-sidebar-primary-action');

        await click('.next-sidebar-navigator-primary-action');

        assert.verifySteps(['primary-action']);

        this.set('primaryAction', {
            label: 'Hidden Action',
            buttonClass: 'hidden-action',
            visible: false,
            onClick: () => assert.step('hidden-action'),
        });

        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} @primaryAction={{this.primaryAction}} />`);

        assert.dom('.next-sidebar-navigator-primary-action').doesNotExist();
    });

    test('it renders compact rows and only shows descriptions when requested', async function (assert) {
        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);

        assert.dom('.next-sidebar-navigator-item:first-of-type').doesNotHaveClass('has-description');
        assert.dom('.next-sidebar-navigator-item:first-of-type .next-sidebar-navigator-item-description').doesNotExist();
        assert.dom('.next-sidebar-navigator-item:nth-of-type(2)').hasAttribute('title', 'Workspace configuration.');
        assert.dom('.next-sidebar-navigator-item:nth-of-type(2) .next-sidebar-navigator-item-caret').exists();

        await click('.next-sidebar-navigator-view-in .next-sidebar-navigator-item:nth-of-type(2)');

        assert.dom('.next-sidebar-navigator-view-in .next-sidebar-navigator-item').hasClass('has-description');
        assert.dom('.next-sidebar-navigator-item-description').hasText('Pricing rules for operations.');
        assert.dom('.next-sidebar-navigator-view-in .next-sidebar-navigator-item').hasAttribute('title', 'Manage service pricing');
    });

    test('it updates an open nested menu when item children change', async function (assert) {
        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);

        await click('.next-sidebar-navigator-view-in .next-sidebar-navigator-item:nth-of-type(2)');

        assert.dom('.next-sidebar-navigator-back').includesText('Settings');
        assert.dom('.next-sidebar-navigator-view-in .next-sidebar-navigator-item').includesText('Service Rates');

        this.set('items', [
            {
                label: 'Orders',
                icon: 'box',
                onClick: () => this.set('selected', 'orders'),
            },
            {
                label: 'Settings',
                icon: 'gear',
                children: [
                    {
                        label: 'Notifications',
                        icon: 'bell',
                        onClick: () => this.set('selected', 'notifications'),
                    },
                ],
            },
        ]);
        await settled();

        assert.dom('.next-sidebar-navigator-back').includesText('Settings');
        assert.dom('.next-sidebar-navigator-view-in .next-sidebar-navigator-item').includesText('Notifications');
        assert.dom('.next-sidebar-navigator-view-in .next-sidebar-navigator-item').doesNotIncludeText('Service Rates');
    });

    test('it morphs search into a portal command panel without replacing the menu body', async function (assert) {
        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} @maxSearchResults={{12}} />`);

        await fillIn('.next-sidebar-navigator-search input', 'pricing');
        await waitFor('.next-sidebar-navigator-search-popover');

        assert.dom('.next-sidebar-navigator-search-popover').exists();
        assert.dom('.next-sidebar-navigator-search').hasClass('is-morphing');
        assert.dom('.next-sidebar .next-sidebar-navigator-search-popover').doesNotExist();
        assert.dom('#application-root-wormhole .next-sidebar-navigator-search-portal').exists();
        assert.dom('#application-root-wormhole .next-sidebar-navigator-search-popover').exists();
        assert.dom('.next-sidebar-navigator-search-overlay').exists();
        assert.dom('.next-sidebar-navigator-search-popover').hasStyle({ position: 'fixed', width: '440px', zIndex: '900' });
        assert.dom('.next-sidebar-navigator-search-popover').hasStyle({ borderColor: 'rgb(209, 213, 219)' });
        assert.notStrictEqual(getComputedStyle(document.querySelector('.next-sidebar-navigator-search-popover')).boxShadow, 'none', 'popover keeps a reduced explicit shadow');
        // openSearch walks `primed` -> (rAF) `opening` -> (180ms) `open`, so waitFor can catch
        // the popover while it is still primed and carrying neither class. Wait for the state
        // rather than sampling it.
        await waitUntil(
            () => {
                const popover = document.querySelector('.next-sidebar-navigator-search-popover');
                return popover?.classList.contains('is-opening') || popover?.classList.contains('is-open');
            },
            { timeout: 2000 }
        );
        assert.dom('.next-sidebar-navigator-search-popover').exists('popover reaches the opening/open state');
        assert.dom('.next-sidebar-navigator-search-popover-input input').hasValue('pricing');
        assert.dom('.next-sidebar-navigator-search-popover-input input').hasStyle({ appearance: 'none' });
        assert.dom('.next-sidebar-navigator-search-result .next-sidebar-navigator-search-result-label').hasText('Service Rates');
        assert.dom('.next-sidebar-navigator-search-result').includesText('Settings > Service Rates');
        assert.dom('.next-sidebar-navigator-view-in').includesText('Orders');

        await click('.next-sidebar-navigator-search-result');

        assert.strictEqual(this.selected, 'service-rates');
    });

    test('it renders a morph-ready portal on focus', async function (assert) {
        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);

        await click('.next-sidebar-navigator-search input');

        assert.dom('.next-sidebar-navigator-search-popover').exists();
        assert.dom('.next-sidebar-navigator-search-overlay').exists();
        assert.true(document.querySelector('.next-sidebar-navigator-search-popover').getAttribute('style').includes('--search-source-scale:'), 'popover has morph source vars');
    });

    test('it caps search results and syncs mouse and keyboard active states', async function (assert) {
        this.set(
            'items',
            Array.from({ length: 16 }, (_, index) => {
                return {
                    label: `Result ${index + 1}`,
                    description: `Description ${index + 1}`,
                    icon: 'box',
                    keywords: ['bulk'],
                    onClick: () => this.set('selected', index + 1),
                };
            })
        );

        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} @maxSearchResults={{12}} />`);
        await fillIn('.next-sidebar-navigator-search input', 'bulk');
        await waitFor('.next-sidebar-navigator-search-result');

        assert.dom('.next-sidebar-navigator-search-result').exists({ count: 12 });
        assert.dom('.next-sidebar-navigator-search-result:first-of-type').hasClass('is-active');
        assert.dom('.next-sidebar-navigator-search-result').hasStyle({ alignItems: 'flex-start' });
        assert.dom('.next-sidebar-navigator-search-result-icon').hasStyle({ marginTop: '2px' });

        await triggerKeyEvent('.next-sidebar-navigator-search-popover-input input', 'keydown', 'ArrowDown');

        assert.dom('[data-search-result-index="1"]').hasClass('is-active');

        await triggerEvent('[data-search-result-index="3"]', 'mouseenter');

        assert.dom('[data-search-result-index="3"]').hasClass('is-active');

        await triggerKeyEvent('.next-sidebar-navigator-search-popover-input input', 'keydown', 'Enter');

        assert.strictEqual(this.selected, 4);
    });

    test('it renders compact search input styles', async function (assert) {
        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);

        assert.dom('.next-sidebar-navigator-search').hasStyle({
            paddingTop: '8px',
            paddingRight: '8px',
            paddingBottom: '8px',
            paddingLeft: '8px',
            backgroundColor: 'rgb(249, 250, 251)',
        });
        assert.dom('.next-sidebar-navigator-search input').hasStyle({
            paddingTop: '0px',
            paddingBottom: '0px',
            paddingLeft: '0px',
            lineHeight: '16px',
            fontSize: '12px',
            appearance: 'none',
        });
    });

    test('it uses gray active styling for light mode', async function (assert) {
        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);

        const item = this.element.querySelector('.next-sidebar-navigator-item:first-of-type');
        item.classList.add('is-active');

        assert.dom(item).hasStyle({ backgroundColor: 'rgb(229, 231, 235)', color: 'rgb(17, 24, 39)' });
        assert.dom('.next-sidebar-navigator-item:first-of-type').hasStyle({ cursor: 'default' });
    });

    test('it focuses search with the keyboard shortcut', async function (assert) {
        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);

        // @ember/test-helpers requires an uppercase key name; the component lower-cases
        // event.key before comparing, so 'K' exercises the same shortcut.
        await triggerKeyEvent(document, 'keydown', 'K', { metaKey: true });
        await waitFor('.next-sidebar-navigator-search-popover-input input');

        assert.dom('.next-sidebar-navigator-search-popover-input input').isFocused();
        assert.dom('.next-sidebar-navigator-search-popover').exists();
    });

    test('it renders provider search results', async function (assert) {
        this.set('searchNavigation', ({ query, limit }) => {
            assert.strictEqual(query, 'tyler');
            assert.strictEqual(limit, 12);

            return [
                {
                    label: 'Tyler Demo',
                    description: 'Console user',
                    icon: 'user',
                    type: 'User',
                    onClick: () => this.set('selected', 'tyler'),
                },
            ];
        });

        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} @searchProvider={{this.searchNavigation}} />`);

        await fillIn('.next-sidebar-navigator-search input', 'tyler');
        await waitFor('.next-sidebar-navigator-search-result');

        assert.dom('.next-sidebar-navigator-search-result').includesText('Tyler Demo');
        assert.dom('.next-sidebar-navigator-search-result').includesText('User');
        assert.dom('.next-sidebar-navigator-search-result').includesText('Console user');

        await click('.next-sidebar-navigator-search-result');

        assert.strictEqual(this.selected, 'tyler');
    });

    test('it recovers when a provider throws synchronously', async function (assert) {
        assert.expect(3);

        this.set('searchNavigation', () => {
            throw new Error('provider failed before returning a promise');
        });

        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} @searchProvider={{this.searchNavigation}} />`);

        await fillIn('.next-sidebar-navigator-search input', 'tyler');

        assert.dom('.next-sidebar-navigator-search-popover').exists();
        assert.dom('.next-sidebar-navigator-search-result').doesNotExist();
        assert.dom('.next-sidebar-navigator-search-status').includesText('No navigation results found.');
    });

    test('it closes the command panel with escape', async function (assert) {
        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);

        await fillIn('.next-sidebar-navigator-search input', 'pricing');
        await waitFor('.next-sidebar-navigator-search-popover');

        await triggerKeyEvent('.next-sidebar-navigator-search-popover-input input', 'keydown', 'Escape');

        assert.dom('.next-sidebar-navigator-search-popover').hasClass('is-closing');
    });

    test('it closes the command panel from the page overlay', async function (assert) {
        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);

        await fillIn('.next-sidebar-navigator-search input', 'pricing');
        await waitFor('.next-sidebar-navigator-search-overlay');

        await click('.next-sidebar-navigator-search-overlay');

        assert.dom('.next-sidebar-navigator-search-popover').hasClass('is-closing');
    });

    module('activating an item', function () {
        function itemNamed(label) {
            return Array.from(document.querySelectorAll('.next-sidebar-navigator-item')).find((node) => node.textContent.includes(label));
        }

        test('an onClick item invokes its handler', async function (assert) {
            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await click(itemNamed('Orders'));

            assert.strictEqual(this.selected, 'orders');
        });

        test('a url item with a target opens a new window', async function (assert) {
            const opened = [];
            const originalOpen = window.open;
            window.open = (...args) => opened.push(args);

            try {
                this.set('items', [{ label: 'Docs', icon: 'book', url: 'https://example.test/docs', target: '_docs' }]);

                await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
                await click(itemNamed('Docs'));

                assert.deepEqual(opened, [['https://example.test/docs', '_docs']]);
            } finally {
                window.open = originalOpen;
            }
        });

        test('a route item transitions through the router', async function (assert) {
            const transitions = [];
            this.owner.unregister('service:router');
            this.owner.register(
                'service:router',
                class extends Service {
                    on() {}
                    off() {}
                    transitionTo(...args) {
                        transitions.push(args);
                        return Promise.resolve();
                    }
                }
            );

            this.set('items', [{ label: 'Orders', icon: 'box', route: 'console.orders', models: ['ord_1'] }]);

            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await click(itemNamed('Orders'));

            assert.deepEqual(transitions, [['console.orders', 'ord_1']]);
        });

        test('a route item carries its query params', async function (assert) {
            const transitions = [];
            this.owner.unregister('service:router');
            this.owner.register(
                'service:router',
                class extends Service {
                    on() {}
                    off() {}
                    transitionTo(...args) {
                        transitions.push(args);
                        return Promise.resolve();
                    }
                }
            );

            this.set('items', [{ label: 'Orders', icon: 'box', route: 'console.orders', queryParams: { status: 'open' } }]);

            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await click(itemNamed('Orders'));

            assert.deepEqual(transitions, [['console.orders', { queryParams: { status: 'open' } }]]);
        });

        test('opening a branch transitions to its default route', async function (assert) {
            const transitions = [];
            this.owner.unregister('service:router');
            this.owner.register(
                'service:router',
                class extends Service {
                    on() {}
                    off() {}
                    transitionTo(...args) {
                        transitions.push(args);
                        return Promise.resolve();
                    }
                }
            );

            this.set('items', [
                {
                    label: 'Settings',
                    icon: 'gear',
                    defaultRoute: 'console.settings.index',
                    defaultModels: ['general'],
                    children: [{ label: 'Service Rates', icon: 'file-invoice-dollar', onClick: () => {} }],
                },
            ]);

            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await click(itemNamed('Settings'));

            assert.deepEqual(transitions, [['console.settings.index', 'general']]);
        });

        test('a default route carries its query params', async function (assert) {
            const transitions = [];
            this.owner.unregister('service:router');
            this.owner.register(
                'service:router',
                class extends Service {
                    on() {}
                    off() {}
                    transitionTo(...args) {
                        transitions.push(args);
                        return Promise.resolve();
                    }
                }
            );

            this.set('items', [
                {
                    label: 'Settings',
                    icon: 'gear',
                    defaultRoute: 'console.settings.index',
                    defaultQueryParams: { tab: 'general' },
                    children: [{ label: 'Service Rates', icon: 'file-invoice-dollar', onClick: () => {} }],
                },
            ]);

            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await click(itemNamed('Settings'));

            assert.deepEqual(transitions, [['console.settings.index', { queryParams: { tab: 'general' } }]]);
        });

        test('a route item with no models transitions with the route alone', async function (assert) {
            const transitions = [];
            this.owner.unregister('service:router');
            this.owner.register(
                'service:router',
                class extends Service {
                    on() {}
                    off() {}
                    transitionTo(...args) {
                        transitions.push(args);
                        return Promise.resolve();
                    }
                }
            );

            this.set('items', [{ label: 'Orders', icon: 'box', route: 'console.orders' }]);

            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await click(itemNamed('Orders'));

            assert.deepEqual(transitions, [['console.orders']], 'no empty model argument is appended');
        });

        test('a default route with no models transitions with the route alone', async function (assert) {
            const transitions = [];
            this.owner.unregister('service:router');
            this.owner.register(
                'service:router',
                class extends Service {
                    on() {}
                    off() {}
                    transitionTo(...args) {
                        transitions.push(args);
                        return Promise.resolve();
                    }
                }
            );

            this.set('items', [
                {
                    label: 'Settings',
                    icon: 'gear',
                    defaultRoute: 'console.settings.index',
                    children: [{ label: 'Service Rates', icon: 'file-invoice-dollar', onClick: () => {} }],
                },
            ]);

            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await click(itemNamed('Settings'));

            assert.deepEqual(transitions, [['console.settings.index']], 'no empty model argument is appended');
        });

        test('a branch with no default route transitions nothing', async function (assert) {
            const transitions = [];
            this.owner.unregister('service:router');
            this.owner.register(
                'service:router',
                class extends Service {
                    on() {}
                    off() {}
                    transitionTo(...args) {
                        transitions.push(args);
                        return Promise.resolve();
                    }
                }
            );

            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await click(itemNamed('Settings'));

            assert.deepEqual(transitions, [], 'opening the branch alone does not navigate');
            assert.dom('.next-sidebar-navigator').includesText('Service Rates', 'but the children are shown');
        });
    });

    module('the search panel keyboard', function () {
        async function openSearchWith(query) {
            await fillIn('.next-sidebar-navigator-search input', query);
            await waitFor('.next-sidebar-navigator-search-popover');
        }

        function results() {
            return Array.from(document.querySelectorAll('.next-sidebar-navigator-search-result'));
        }

        function activeIndex() {
            return results().findIndex((node) => node.classList.contains('is-active'));
        }

        test('arrow keys move the active result and wrap at the ends', async function (assert) {
            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await openSearchWith('s');

            assert.true(results().length > 1, `${results().length} results are offered`);
            assert.strictEqual(activeIndex(), 0, 'the first result starts active');

            await triggerKeyEvent('.next-sidebar-navigator-search-popover', 'keydown', 'ArrowDown');
            assert.strictEqual(activeIndex(), 1, 'down moves to the next result');

            await triggerKeyEvent('.next-sidebar-navigator-search-popover', 'keydown', 'ArrowUp');
            assert.strictEqual(activeIndex(), 0, 'up moves back');

            await triggerKeyEvent('.next-sidebar-navigator-search-popover', 'keydown', 'ArrowUp');
            assert.strictEqual(activeIndex(), 0, 'up from the first result stays put');
        });

        test('enter opens the active result', async function (assert) {
            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await openSearchWith('pricing');

            await triggerKeyEvent('.next-sidebar-navigator-search-popover', 'keydown', 'Enter');

            assert.strictEqual(this.selected, 'service-rates', 'the active result is activated');
        });

        test('escape closes the search panel', async function (assert) {
            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await openSearchWith('pricing');

            assert.ok(document.querySelector('.next-sidebar-navigator-search-popover'), 'the panel is open');

            await triggerKeyEvent('.next-sidebar-navigator', 'keydown', 'Escape');

            // closeSearch() defers the teardown behind a 160ms window.setTimeout for the close
            // animation, which settled() does not wait on.
            await waitUntil(() => !document.querySelector('.next-sidebar-navigator-search-popover'), { timeout: 2000 });

            assert.notOk(document.querySelector('.next-sidebar-navigator-search-popover'), 'the panel is closed');
        });

        test('escape in a nested menu steps back to the root', async function (assert) {
            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await click(Array.from(document.querySelectorAll('.next-sidebar-navigator-item')).find((node) => node.textContent.includes('Settings')));

            assert.dom('.next-sidebar-navigator').includesText('Service Rates', 'the nested menu is showing');

            await triggerKeyEvent('.next-sidebar-navigator', 'keydown', 'Escape');

            assert.dom('.next-sidebar-navigator').includesText('Orders', 'the root menu is back');
        });

        test('a key other than escape is ignored', async function (assert) {
            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await click(Array.from(document.querySelectorAll('.next-sidebar-navigator-item')).find((node) => node.textContent.includes('Settings')));

            await triggerKeyEvent('.next-sidebar-navigator', 'keydown', 'Enter');

            assert.dom('.next-sidebar-navigator').includesText('Service Rates', 'the nested menu is left alone');
        });

        test('the clear button empties the query and closes the results', async function (assert) {
            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await openSearchWith('pricing');

            await click('.next-sidebar-navigator-search-clear');

            assert.dom('.next-sidebar-navigator-search input').hasValue('', 'the query is cleared');
            assert.strictEqual(results().length, 0, 'no results are left');
        });
    });

    module('items identified by a title', function () {
        // `label` is the usual name, but every read of it falls back to `title`, so an item
        // carrying only a title has to be navigable, titled and searchable like any other.
        const TITLED = [
            {
                title: 'Reports',
                icon: 'chart-line',
                children: [{ label: 'Daily', icon: 'calendar-day', onClick() {} }],
            },
        ];

        test('a title-only parent can be opened and names the nested view', async function (assert) {
            this.set('items', TITLED);

            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await click(Array.from(document.querySelectorAll('.next-sidebar-navigator-item')).find((node) => node.textContent.includes('Reports')));

            assert.dom('.next-sidebar-navigator').includesText('Daily', 'the nested menu is showing');
            assert.dom('.next-sidebar-navigator-back').includesText('Reports', 'the title stands in for the missing label');
        });

        test('it renders without an items argument at all', async function (assert) {
            await render(hbs`<Layout::Sidebar::Navigator />`);

            assert.dom('.next-sidebar-navigator').exists('the navigator still mounts');
            assert.dom('.next-sidebar-navigator-item').doesNotExist('with nothing to list');
        });

        test('a title-only item is searchable and labelled by its title', async function (assert) {
            this.set('items', TITLED);

            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await fillIn('.next-sidebar-navigator-search input', 'repor');
            await waitFor('.next-sidebar-navigator-search-result');

            assert.dom('.next-sidebar-navigator-search-result .next-sidebar-navigator-search-result-label').hasText('Reports');
        });

        test('opening a search result that has children drills into it', async function (assert) {
            this.set('items', TITLED);

            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await fillIn('.next-sidebar-navigator-search input', 'repor');
            await waitFor('.next-sidebar-navigator-search-result');

            await click('.next-sidebar-navigator-search-result');

            assert.dom('.next-sidebar-navigator').includesText('Daily', 'the parent is entered rather than activated');
        });
    });

    module('reduced motion', function () {
        // `reducedMotion` is read once, as a class field, so the stub has to be in place before
        // the component is constructed. Only the one query is answered; everything else is
        // delegated so nothing else in the render is disturbed.
        function stubReducedMotion() {
            const original = window.matchMedia;

            window.matchMedia = (query) => {
                if (query === '(prefers-reduced-motion: reduce)') {
                    return { matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} };
                }

                return original.call(window, query);
            };

            return () => {
                window.matchMedia = original;
            };
        }

        test('the search panel opens and closes without the animation states', async function (assert) {
            const restore = stubReducedMotion();

            try {
                await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
                await fillIn('.next-sidebar-navigator-search input', 'pricing');
                await waitFor('.next-sidebar-navigator-search-popover');

                assert.dom('.next-sidebar-navigator-search-popover').hasClass('is-open', 'it goes straight to open, skipping primed/opening');

                await triggerKeyEvent('.next-sidebar-navigator', 'keydown', 'Escape');

                // No 160ms close animation to wait on this time — the teardown is synchronous.
                assert.dom('.next-sidebar-navigator-search-popover').doesNotExist('and closing takes effect immediately');
            } finally {
                restore();
            }
        });
    });

    module('the search provider', function () {
        const PROVIDER_TEMPLATE = hbs`<Layout::Sidebar::Navigator @items={{this.items}} @searchProvider={{this.searchNavigation}} />`;

        test('a rejected provider promise leaves the panel empty rather than throwing', async function (assert) {
            this.set('searchNavigation', () => Promise.reject(new Error('provider is down')));

            await render(PROVIDER_TEMPLATE);
            await fillIn('.next-sidebar-navigator-search input', 'tyler');
            await waitUntil(() => document.querySelector('.next-sidebar-navigator-search-status')?.textContent.includes('No navigation results found'), { timeout: 2000 });

            assert.dom('.next-sidebar-navigator-search-result').doesNotExist('nothing is offered');
            assert.dom('.next-sidebar-navigator-search-status').includesText('No navigation results found.', 'and the panel settles out of its loading state');
        });

        test('a provider that resolves nothing is treated as an empty result set', async function (assert) {
            this.set('searchNavigation', () => Promise.resolve(undefined));

            await render(PROVIDER_TEMPLATE);
            await fillIn('.next-sidebar-navigator-search input', 'tyler');
            await waitUntil(() => document.querySelector('.next-sidebar-navigator-search-status')?.textContent.includes('No navigation results found'), { timeout: 2000 });

            assert.dom('.next-sidebar-navigator-search-result').doesNotExist();
            assert.dom('.next-sidebar-navigator-search-status').includesText('No navigation results found.');
        });

        // Each keystroke takes a new token; a slower earlier request that lands afterwards has to
        // be discarded, or the panel would show results for a query the user has moved past.
        test('results from a superseded query are discarded', async function (assert) {
            const resolvers = [];
            this.set('searchNavigation', () => new Promise((resolve) => resolvers.push(resolve)));

            await render(PROVIDER_TEMPLATE);
            await fillIn('.next-sidebar-navigator-search input', 'ty');
            await fillIn('.next-sidebar-navigator-search input', 'tyler');

            assert.strictEqual(resolvers.length, 2, 'both keystrokes reached the provider');

            resolvers[1]([{ label: 'Tyler Demo', icon: 'user', type: 'User' }]);
            await waitUntil(() => document.querySelector('.next-sidebar-navigator-search-result'), { timeout: 2000 });

            resolvers[0]([{ label: 'Stale Result', icon: 'user', type: 'User' }]);
            await settled();

            const labels = Array.from(document.querySelectorAll('.next-sidebar-navigator-search-result')).map((node) => node.textContent);
            assert.true(
                labels.some((label) => label.includes('Tyler Demo')),
                'the current query keeps its results'
            );
            assert.false(
                labels.some((label) => label.includes('Stale Result')),
                'the superseded query does not overwrite them'
            );
        });
    });

    module('keyboard and transition edges', function () {
        test('control-k opens the search from anywhere on the page', async function (assert) {
            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);

            assert.dom('.next-sidebar-navigator-search-popover').doesNotExist('the panel starts closed');

            await triggerKeyEvent(document, 'keydown', 'K', { ctrlKey: true });
            await waitFor('.next-sidebar-navigator-search-popover');

            assert.dom('.next-sidebar-navigator-search-popover').exists('the document shortcut works with control as well as command');
        });

        test('arrow keys are ignored while the panel has no results', async function (assert) {
            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await fillIn('.next-sidebar-navigator-search input', 'nothing-matches-this');
            await waitFor('.next-sidebar-navigator-search-popover');

            assert.dom('.next-sidebar-navigator-search-result').doesNotExist('there is nothing to move between');

            await triggerKeyEvent('.next-sidebar-navigator-search-popover', 'keydown', 'ArrowDown');

            assert.dom('.next-sidebar-navigator-search-popover').exists('the panel is left alone');
            assert.dom('.next-sidebar-navigator-search-result').doesNotExist();
        });

        test('a key the panel does not handle leaves the active result alone', async function (assert) {
            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await fillIn('.next-sidebar-navigator-search input', 's');
            await waitFor('.next-sidebar-navigator-search-result');

            await triggerKeyEvent('.next-sidebar-navigator-search-popover', 'keydown', 'ArrowDown');
            const activeAfterDown = Array.from(document.querySelectorAll('.next-sidebar-navigator-search-result')).findIndex((node) => node.classList.contains('is-active'));

            await triggerKeyEvent('.next-sidebar-navigator-search-popover', 'keydown', 'Tab');
            const activeAfterOtherKey = Array.from(document.querySelectorAll('.next-sidebar-navigator-search-result')).findIndex((node) => node.classList.contains('is-active'));

            assert.strictEqual(activeAfterOtherKey, activeAfterDown, 'an unhandled key changes nothing');
        });

        // The outgoing view is held for 220ms so the slide can play out, then released behind a
        // window.setTimeout that settled() does not wait on.
        test('the outgoing view is released once the transition finishes', async function (assert) {
            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await click(Array.from(document.querySelectorAll('.next-sidebar-navigator-item')).find((node) => node.textContent.includes('Settings')));

            assert.dom('.next-sidebar-navigator-viewport').hasClass('is-transitioning', 'the outgoing view is still mounted');

            await waitUntil(() => !document.querySelector('.next-sidebar-navigator-viewport.is-transitioning'), { timeout: 2000 });

            assert.dom('.next-sidebar-navigator-viewport').doesNotHaveClass('is-transitioning', 'and is released when the slide ends');
        });

        test('escape at the root with nothing open does nothing', async function (assert) {
            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);

            assert.dom('.next-sidebar-navigator-back').doesNotExist('the root has nothing to go back to');

            await triggerKeyEvent('.next-sidebar-navigator', 'keydown', 'Escape');

            assert.dom('.next-sidebar-navigator-back').doesNotExist('and escape leaves it that way');
            assert.dom('.next-sidebar-navigator').includesText('Orders', 'the root menu is untouched');
        });

        test('the search popover settles into its open state', async function (assert) {
            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await fillIn('.next-sidebar-navigator-search input', 'pricing');

            // primed -> (rAF) opening -> (180ms) open; only the last step is on a timer that
            // settled() does not wait for.
            await waitUntil(() => document.querySelector('.next-sidebar-navigator-search-popover.is-open'), { timeout: 2000 });

            assert.dom('.next-sidebar-navigator-search-popover').hasClass('is-open', 'the opening animation completes');
        });

        // openSearch runs again while the panel is still closing, and the portal it would create
        // is already in the document — a second one would orphan the first.
        test('typing again while the panel is closing reuses the portal', async function (assert) {
            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await fillIn('.next-sidebar-navigator-search input', 'pricing');
            await waitFor('.next-sidebar-navigator-search-popover');

            await triggerKeyEvent('.next-sidebar-navigator-search-popover-input input', 'keydown', 'Escape');
            assert.dom('.next-sidebar-navigator-search-popover').hasClass('is-closing', 'the close animation has started');

            await fillIn('.next-sidebar-navigator-search input', 'rates');

            assert.strictEqual(document.querySelectorAll('.next-sidebar-navigator-search-portal').length, 1, 'exactly one portal is in the document');
        });
    });

    module('the view stack against changing items', function () {
        test('a stacked parent that disappears from the items drops the stack', async function (assert) {
            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await click(Array.from(document.querySelectorAll('.next-sidebar-navigator-item')).find((node) => node.textContent.includes('Settings')));

            assert.dom('.next-sidebar-navigator-back').includesText('Settings', 'the nested view is open');

            this.set('items', [{ label: 'Reports', icon: 'chart-line', onClick: () => this.set('selected', 'reports') }]);
            await settled();

            assert.dom('.next-sidebar-navigator-back').doesNotExist('the stack cannot be resolved any more, so it is dropped');
            assert.dom('.next-sidebar-navigator').includesText('Reports', 'the new root is shown');
        });

        test('a predicate that throws is treated as consent to sync', async function (assert) {
            class RouterStub extends Service {
                currentRouteName = 'console.settings.index';
                currentURL = '/settings';

                on() {}
                off() {}
            }

            this.owner.register('service:router', RouterStub);
            this.set('items', [
                {
                    label: 'Settings',
                    children: [
                        {
                            label: 'General',
                            route: 'console.settings.index',
                        },
                    ],
                },
            ]);
            this.set('shouldSyncInitialActiveParent', () => {
                throw new Error('the host application blew up deciding');
            });

            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} @shouldSyncInitialActiveParent={{this.shouldSyncInitialActiveParent}} />`);

            assert.dom('.next-sidebar-navigator-back').includesText('Settings', 'a broken predicate does not block the sync');
            assert.dom('.next-sidebar-navigator-view-in .next-sidebar-navigator-item').includesText('General');
        });
    });
    // transitionItem() has four shapes: an onClick handler, a url opened in a target window, a url
    // assigned to location, and a route transition. Only the onClick shape had a test, so the
    // other three had never run.
    module('activating a search result that is not an onClick item', function () {
        async function searchAndOpen(query) {
            await fillIn('.next-sidebar-navigator-search input', query);
            await waitFor('.next-sidebar-navigator-search-popover');
            await triggerKeyEvent('.next-sidebar-navigator-search-popover', 'keydown', 'Enter');
        }

        test('an item with a target opens a new window rather than navigating', async function (assert) {
            const opened = [];
            window.open = (url, target) => opened.push({ url, target });

            this.set('items', [{ id: 'docs', title: 'Documentation', url: 'https://example.test/docs', target: '_blank' }]);

            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await searchAndOpen('Documentation');

            assert.deepEqual(opened, [{ url: 'https://example.test/docs', target: '_blank' }], 'the target is honoured');
        });

        test('an item with a plain url navigates to it', async function (assert) {
            this.set('items', [{ id: 'changelog', title: 'Changelog', url: 'https://example.test/changelog' }]);

            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await searchAndOpen('Changelog');

            assert.strictEqual(window.location.href, 'https://example.test/changelog', 'the url is assigned to location');
        });

        test('an item with a route transitions through the router', async function (assert) {
            const transitions = [];
            this.owner.register(
                'service:router',
                class extends Service {
                    transitionTo(...args) {
                        transitions.push(args);
                    }
                }
            );

            this.set('items', [{ id: 'orders', title: 'Orders', route: 'console.orders' }]);

            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await searchAndOpen('Orders');

            assert.deepEqual(transitions, [['console.orders']], 'the route is handed to the router');
        });

        test('an item with a route and query params carries them through', async function (assert) {
            const transitions = [];
            this.owner.register(
                'service:router',
                class extends Service {
                    transitionTo(...args) {
                        transitions.push(args);
                    }
                }
            );

            this.set('items', [{ id: 'orders', title: 'Orders', route: 'console.orders', queryParams: { status: 'open' } }]);

            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await searchAndOpen('Orders');

            assert.deepEqual(transitions, [['console.orders', { queryParams: { status: 'open' } }]], 'the query params ride along');
        });
    });
    // shortcutLabel picks its wording from navigator.platform. Without a test that overrides the
    // platform, the arm that runs depends on the machine — Cmd K on a developer's Mac, Ctrl K on a
    // Linux CI box — so the file's branch coverage would differ between them and a 100% gate could
    // pass in one place and fail in the other.
    module('the keyboard shortcut label', function () {
        test('a mac reports the command key', async function (assert) {
            window.navigator = { platform: 'MacIntel' };

            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);

            assert.dom('.next-sidebar-navigator-search').includesText('Cmd K', 'the mac wording');
        });

        test('anything else reports the control key', async function (assert) {
            window.navigator = { platform: 'Linux x86_64' };

            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);

            assert.dom('.next-sidebar-navigator-search').includesText('Ctrl K', 'the non-mac wording');
        });
    });
    // Remaining second-state paths: the collaborators and shapes the existing tests never produce.
    module('shapes the happy path never produces', function () {
        test('closing the search when no popover is open is a no-op', async function (assert) {
            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);

            // Escape with the panel already closed takes closeSearch()'s early return.
            await triggerKeyEvent('.next-sidebar-navigator', 'keydown', 'Escape');

            assert.notOk(document.querySelector('.next-sidebar-navigator-search-popover'), 'still closed, and nothing threw');
        });

        test('a leaf item with no children stacks nothing', async function (assert) {
            this.set('items', [{ id: 'solo', title: 'Solo', onClick: () => this.set('selected', 'solo') }]);

            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await click('.next-sidebar-navigator-item');

            assert.strictEqual(this.selected, 'solo', 'the leaf activates directly');
        });

        // Reaching transitionItem()'s final else by giving an item nothing to act on. Unregistering
        // the router would reach it too, but the router is resolver-provided and removing it breaks
        // Ember's own routing internals (`Cannot read properties of undefined (reading 'hasRoute')`).
        test('an item with nothing to navigate to is inert', async function (assert) {
            this.set('items', [{ id: 'label-only', title: 'Label Only' }]);

            await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);
            await fillIn('.next-sidebar-navigator-search input', 'Label Only');
            await waitFor('.next-sidebar-navigator-search-popover');
            await triggerKeyEvent('.next-sidebar-navigator-search-popover', 'keydown', 'Enter');

            assert.dom('.next-sidebar-navigator').exists('the navigator survives an item with no destination');
        });
    });
});
