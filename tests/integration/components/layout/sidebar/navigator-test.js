import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { click, fillIn, render, settled, triggerEvent, triggerKeyEvent, waitFor } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

module('Integration | Component | layout/sidebar/navigator', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.wormholeRoot = document.getElementById('application-root-wormhole');

        if (!this.wormholeRoot) {
            this.wormholeRoot = document.createElement('div');
            this.wormholeRoot.id = 'application-root-wormhole';
            document.body.appendChild(this.wormholeRoot);
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

    test('it lets an initial active parent predicate suppress initial nested sync through the first route event', async function (assert) {
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
        this.set('shouldSyncInitialActiveParent', ({ activePath, routeName, currentURL }) => {
            if (routeName === 'console.settings.index') {
                assert.deepEqual(
                    activePath.map((item) => item.label),
                    ['Settings', 'General']
                );
                assert.strictEqual(currentURL, '/settings');
                return false;
            }

            return true;
        });

        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} @shouldSyncInitialActiveParent={{this.shouldSyncInitialActiveParent}} />`);

        assert.dom('.next-sidebar-navigator-back').doesNotExist('initial render stays at root when predicate returns false');
        assert.dom('.next-sidebar-navigator-view-in').includesText('Settings');

        const router = this.owner.lookup('service:router');
        router.triggerRouteDidChange();
        await settled();

        assert.dom('.next-sidebar-navigator-back').doesNotExist('first route event is still treated as initial entry');
        assert.dom('.next-sidebar-navigator-view-in').includesText('Settings');

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
        assert.dom('.next-sidebar-navigator-view-in .next-sidebar-navigator-item').includesText('General');
        assert.dom('.next-sidebar-navigator-view-in .next-sidebar-navigator-item').includesText('Security');
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
        assert.true(
            document.querySelector('.next-sidebar-navigator-search-popover').classList.contains('is-opening') ||
                document.querySelector('.next-sidebar-navigator-search-popover').classList.contains('is-open'),
            'popover is in the opening/open state'
        );
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

        await triggerKeyEvent(document, 'keydown', 'k', { metaKey: true });
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
});
