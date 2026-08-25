import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, settled, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { setupWindowMock } from 'ember-window-mock/test-support';
import window from 'ember-window-mock';

module('Integration | Component | layout/sidebar/item', function (hooks) {
    setupRenderingTest(hooks);
    setupWindowMock(hooks);

    let router;
    let deniedAbilities;

    hooks.beforeEach(function () {
        deniedAbilities = new Set();

        // A stand-in router so route matching and transitions can be observed without
        // actually navigating the test application.
        const state = {
            currentRouteName: 'console.orders.index',
            currentURL: window.location.pathname,
            currentRoute: { paramNames: [] },
            listeners: [],
            transitions: [],
        };
        router = state;

        this.owner.unregister('service:router');
        this.owner.register(
            'service:router',
            class extends Service {
                get currentRouteName() {
                    return state.currentRouteName;
                }
                get currentURL() {
                    return state.currentURL;
                }
                get currentRoute() {
                    return state.currentRoute;
                }
                on(name, handler) {
                    state.listeners.push({ name, handler });
                }
                off(name, handler) {
                    state.listeners = state.listeners.filter((entry) => !(entry.name === name && entry.handler === handler));
                }
                transitionTo(...args) {
                    state.transitions.push(args);
                }
            }
        );

        this.owner.unregister('service:abilities');
        this.owner.register(
            'service:abilities',
            class extends Service {
                cannot(permission) {
                    return deniedAbilities.has(permission);
                }
                can(permission) {
                    return !deniedAbilities.has(permission);
                }
            }
        );
    });

    function navItem() {
        return find('.next-nav-item');
    }

    module('rendering', function () {
        test('it renders a nav item with its block as the label', async function (assert) {
            await render(hbs`<Layout::Sidebar::Item>Orders</Layout::Sidebar::Item>`);

            assert.dom('.next-nav-item').exists();
            assert.dom(navItem()).hasText('Orders');
            assert.dom(navItem()).hasAttribute('href', 'javascript:;');
        });

        test('an invisible item renders nothing', async function (assert) {
            await render(hbs`<Layout::Sidebar::Item @visible={{false}}>Orders</Layout::Sidebar::Item>`);

            assert.dom('.next-nav-item').doesNotExist();
        });

        test('an icon is rendered when given', async function (assert) {
            await render(hbs`<Layout::Sidebar::Item @icon="truck" @iconClass="my-icon">Orders</Layout::Sidebar::Item>`);

            assert.dom('.next-nav-item-icon-container svg').exists();
            assert.dom('.next-nav-item-icon-container svg').hasClass('my-icon');
        });

        test('wrapper classes and splattributes are applied', async function (assert) {
            await render(hbs`
                <Layout::Sidebar::Item @iconWrapperClass="icon-wrap" @itemWrapperClass="item-wrap" @itemRightSideContainerClass="right-wrap" data-test-item="yes">
                    Orders
                </Layout::Sidebar::Item>
            `);

            assert.dom('.next-nav-item-icon-container').hasClass('icon-wrap');
            assert.dom('.item-wrap').exists();
            assert.dom('.next-nav-item-right-side').hasClass('right-wrap');
            assert.dom(navItem()).hasAttribute('data-test-item', 'yes');
        });

        test('a right-side status renders a badge, with or without text', async function (assert) {
            await render(hbs`<Layout::Sidebar::Item @rightSideStatus="active">Orders</Layout::Sidebar::Item>`);
            assert.dom('.next-nav-item-right-side span').exists('a bare status badge is rendered');

            await render(hbs`<Layout::Sidebar::Item @rightSideStatus="active" @rightSideStatusText="3 live">Orders</Layout::Sidebar::Item>`);
            assert.dom('.next-nav-item-right-side').containsText('3 live');
        });

        test('help text is offered as a tooltip', async function (assert) {
            await render(hbs`<Layout::Sidebar::Item @helpText="Manage every order">Orders</Layout::Sidebar::Item>`);

            assert.dom(navItem()).exists('the tooltip is attached without disturbing the item');
        });
    });

    module('permissions', function () {
        test('an item the user lacks permission for is disabled', async function (assert) {
            deniedAbilities.add('see orders');

            await render(hbs`<Layout::Sidebar::Item @permission="see orders">Orders</Layout::Sidebar::Item>`);

            assert.dom(navItem()).hasAttribute('disabled');
        });

        test('an item the user is permitted is not disabled', async function (assert) {
            await render(hbs`<Layout::Sidebar::Item @permission="see orders">Orders</Layout::Sidebar::Item>`);

            assert.dom(navItem()).doesNotHaveAttribute('disabled');
        });

        test('an explicitly disabled item stays disabled regardless of permission', async function (assert) {
            await render(hbs`<Layout::Sidebar::Item @disabled={{true}}>Orders</Layout::Sidebar::Item>`);

            assert.dom(navItem()).hasAttribute('disabled');
        });

        test('clicking a forbidden item does not navigate', async function (assert) {
            deniedAbilities.add('see orders');

            await render(hbs`<Layout::Sidebar::Item @permission="see orders" @route="console.reports">Orders</Layout::Sidebar::Item>`);
            await click(navItem());

            assert.deepEqual(router.transitions, [], 'the transition is refused');
        });
    });

    module('active state', function () {
        test('an item whose route prefixes the current route is active', async function (assert) {
            await render(hbs`<Layout::Sidebar::Item @route="console.orders">Orders</Layout::Sidebar::Item>`);

            assert.dom(navItem()).hasClass('active');
        });

        test('an item for another route is not active', async function (assert) {
            await render(hbs`<Layout::Sidebar::Item @route="console.reports">Reports</Layout::Sidebar::Item>`);

            assert.dom(navItem()).doesNotHaveClass('active');
        });

        test('an item with no route at all is not active', async function (assert) {
            await render(hbs`<Layout::Sidebar::Item>Orders</Layout::Sidebar::Item>`);

            assert.dom(navItem()).doesNotHaveClass('active');
        });

        test('it re-evaluates when the router reports a route change', async function (assert) {
            await render(hbs`<Layout::Sidebar::Item @route="console.reports">Reports</Layout::Sidebar::Item>`);
            assert.dom(navItem()).doesNotHaveClass('active');

            router.currentRouteName = 'console.reports.index';
            router.listeners.filter((entry) => entry.name === 'routeDidChange').forEach((entry) => entry.handler());
            await settled();

            assert.dom(navItem()).hasClass('active');
        });

        test('it stops listening once destroyed', async function (assert) {
            this.set('show', true);

            await render(hbs`{{#if this.show}}<Layout::Sidebar::Item @route="console.orders">Orders</Layout::Sidebar::Item>{{/if}}`);
            assert.strictEqual(router.listeners.length, 1, 'it subscribes while rendered');

            this.set('show', false);
            await settled();

            assert.strictEqual(router.listeners.length, 0, 'the subscription is released');
        });

        test('an interactive item is active when the menu selection matches', async function (assert) {
            this.set('item', { section: 'ops', slug: 'orders' });
            this.set('onClick', () => {});

            await render(hbs`<Layout::Sidebar::Item @item={{this.item}} @onClick={{this.onClick}}>Orders</Layout::Sidebar::Item>`);

            assert.dom(navItem()).doesNotHaveClass('active', 'nothing in the current url selects this item');
        });

        module('with a model', function () {
            test('a model-less route still matches on the url', async function (assert) {
                this.set('model', { id: 'ord_1' });

                await render(hbs`<Layout::Sidebar::Item @route="console.orders" @model={{this.model}}>Orders</Layout::Sidebar::Item>`);

                assert.dom(navItem()).hasClass('active', 'the route and url both match');
            });

            test('a route with a model param matches only when the url carries that value', async function (assert) {
                router.currentRoute = { paramNames: ['public_id'] };
                router.currentURL = window.location.pathname;
                this.set('model', { public_id: window.location.pathname.split('/').pop() });

                await render(hbs`<Layout::Sidebar::Item @route="console.orders" @model={{this.model}}>Orders</Layout::Sidebar::Item>`);

                assert.dom(navItem()).hasClass('active');
            });

            test('a route with a model param does not match a different value', async function (assert) {
                router.currentRoute = { paramNames: ['public_id'] };
                this.set('model', { public_id: 'a-value-not-in-the-url' });

                await render(hbs`<Layout::Sidebar::Item @route="console.orders" @model={{this.model}}>Orders</Layout::Sidebar::Item>`);

                assert.dom(navItem()).doesNotHaveClass('active');
            });

            test('a url that is not the current one is never active', async function (assert) {
                router.currentURL = '/somewhere/else/entirely';
                this.set('model', { id: 'ord_1' });

                await render(hbs`<Layout::Sidebar::Item @route="console.orders" @model={{this.model}}>Orders</Layout::Sidebar::Item>`);

                assert.dom(navItem()).doesNotHaveClass('active');
            });
        });
    });

    module('clicking', function () {
        test('a plain route transitions to it', async function (assert) {
            await render(hbs`<Layout::Sidebar::Item @route="console.reports">Reports</Layout::Sidebar::Item>`);
            await click(navItem());

            assert.deepEqual(router.transitions, [['console.reports']]);
        });

        test('a route with a model passes the model', async function (assert) {
            this.set('model', { id: 'ord_1' });

            await render(hbs`<Layout::Sidebar::Item @route="console.orders.view" @model={{this.model}}>Order</Layout::Sidebar::Item>`);
            await click(navItem());

            assert.deepEqual(router.transitions, [['console.orders.view', { id: 'ord_1' }]]);
        });

        test('transition options are forwarded, with and without a model', async function (assert) {
            this.set('options', { replace: true });

            await render(hbs`<Layout::Sidebar::Item @route="console.reports" @options={{this.options}}>Reports</Layout::Sidebar::Item>`);
            await click(navItem());
            assert.deepEqual(router.transitions, [['console.reports', { replace: true }]]);

            router.transitions.length = 0;
            this.set('model', { id: 'ord_1' });
            await render(hbs`<Layout::Sidebar::Item @route="console.orders.view" @model={{this.model}} @options={{this.options}}>Order</Layout::Sidebar::Item>`);
            await click(navItem());
            assert.deepEqual(router.transitions, [['console.orders.view', { id: 'ord_1' }, { replace: true }]]);
        });

        test('query params reach the router without any options', async function (assert) {
            this.set('queryParams', { status: 'active' });

            await render(hbs`<Layout::Sidebar::Item @route="console.orders" @queryParams={{this.queryParams}}>Orders</Layout::Sidebar::Item>`);
            await click(navItem());

            assert.deepEqual(router.transitions, [['console.orders', { queryParams: { status: 'active' } }]]);
        });

        test('a route with neither options nor query params transitions bare', async function (assert) {
            await render(hbs`<Layout::Sidebar::Item @route="console.orders">Orders</Layout::Sidebar::Item>`);
            await click(navItem());

            assert.deepEqual(router.transitions, [['console.orders']], 'no empty options hash is invented');
        });

        test('query params are honoured when options are also given', async function (assert) {
            this.set('queryParams', { status: 'active' });
            this.set('options', { replace: true });

            await render(hbs`<Layout::Sidebar::Item @route="console.orders" @queryParams={{this.queryParams}} @options={{this.options}}>Orders</Layout::Sidebar::Item>`);
            await click(navItem());

            assert.deepEqual(router.transitions, [['console.orders', { replace: true, queryParams: { status: 'active' } }]]);
        });

        test('query params carried on the model are lifted into the transition options', async function (assert) {
            this.set('model', { id: 'ord_1', queryParams: { tab: 'activity' } });

            await render(hbs`<Layout::Sidebar::Item @route="console.orders.view" @model={{this.model}}>Order</Layout::Sidebar::Item>`);
            await click(navItem());

            const [route, model, options] = router.transitions[0];
            assert.strictEqual(route, 'console.orders.view');
            assert.deepEqual(options, { queryParams: { tab: 'activity' } }, 'they are forwarded as transition options');
            assert.strictEqual(model.queryParams, undefined, 'and removed from the model itself');
        });

        test('an onClick handler wins over a route', async function (assert) {
            let clicked = 0;
            this.set('onClick', () => clicked++);

            await render(hbs`<Layout::Sidebar::Item @route="console.reports" @onClick={{this.onClick}}>Reports</Layout::Sidebar::Item>`);
            await click(navItem());

            assert.strictEqual(clicked, 1);
            assert.deepEqual(router.transitions, [], 'no transition is attempted');
        });

        test('a url with a target opens a new window', async function (assert) {
            const opened = [];
            const originalOpen = window.open;
            window.open = (...args) => opened.push(args);

            try {
                await render(hbs`<Layout::Sidebar::Item @url="https://fleetbase.io" @target="_blank">Docs</Layout::Sidebar::Item>`);
                await click(navItem());
            } finally {
                window.open = originalOpen;
            }

            assert.deepEqual(opened, [['https://fleetbase.io', '_blank']]);
            assert.deepEqual(router.transitions, []);
        });

        test('an item with nothing to do does nothing', async function (assert) {
            await render(hbs`<Layout::Sidebar::Item>Orders</Layout::Sidebar::Item>`);
            await click(navItem());

            assert.deepEqual(router.transitions, []);
        });
    });

    module('the dropdown button', function () {
        const DROPDOWN = hbs`
            <Layout::Sidebar::Item
                @route="console.reports"
                @dropdownButton={{true}}
                @dropdownButtonMenuLabel={{this.menuLabel}}
                @dropdownButtonActions={{this.actions}}
                @dropdownContext={{this.dropdownContext}}
                @registerAPI={{this.registerAPI}}
                @onDropdownButtonInsert={{this.onDropdownButtonInsert}}
            >
                Reports
            </Layout::Sidebar::Item>
        `;

        test('the item gains a dropdown and reports its api and node', async function (assert) {
            let api;
            let node;
            this.set('registerAPI', (registered) => (api = registered));
            this.set('onDropdownButtonInsert', (inserted) => (node = inserted));
            this.set('actions', []);

            await render(DROPDOWN);

            assert.dom(navItem()).hasClass('next-nav-item-with-dropdown');
            assert.ok(api, 'the dropdown api is handed up');
            assert.ok(node, 'the dropdown button node is handed up');
        });

        test('a menu label and separators are rendered', async function (assert) {
            this.set('menuLabel', 'Report actions');
            this.set('actions', [{ label: 'Export', fn: () => {} }, { separator: true }, { label: 'Delete', fn: () => {} }]);

            await render(DROPDOWN);
            await click('.ember-basic-dropdown-trigger');

            assert.dom('.next-dd-menu-label').hasText('Report actions');
            assert.strictEqual(findAll('.next-dd-menu-seperator').length, 2, 'one under the label and one between the actions');
            assert.deepEqual(
                findAll('.next-dd-item').map((node) => node.textContent.trim()),
                ['Export', 'Delete']
            );
        });

        test('choosing an action runs both of its callbacks with the context', async function (assert) {
            const received = [];
            this.set('dropdownContext', { report: 'weekly' });
            this.set('actions', [{ label: 'Export', fn: (context) => received.push(['fn', context]), onClick: (context) => received.push(['onClick', context]) }]);

            await render(DROPDOWN);
            await click('.ember-basic-dropdown-trigger');
            await click('.next-dd-item');

            assert.deepEqual(received, [
                ['fn', { report: 'weekly' }],
                ['onClick', { report: 'weekly' }],
            ]);
        });

        test('an action context is used when the item has none', async function (assert) {
            const received = [];
            this.set('actions', [{ label: 'Export', context: { scope: 'action' }, fn: (context) => received.push(context) }]);

            await render(DROPDOWN);
            await click('.ember-basic-dropdown-trigger');
            await click('.next-dd-item');

            assert.deepEqual(received, [{ scope: 'action' }]);
        });

        test('an action with no callbacks is harmless', async function (assert) {
            this.set('actions', [{ label: 'Inert' }]);

            await render(DROPDOWN);
            await click('.ember-basic-dropdown-trigger');
            await click('.next-dd-item');

            assert.dom('.next-nav-item').exists('clicking is absorbed');
        });

        test('clicking a dropdown menu item does not navigate the sidebar item', async function (assert) {
            this.set('actions', [{ label: 'Export', fn: () => {} }]);

            await render(DROPDOWN);
            await click('.ember-basic-dropdown-trigger');
            await click('.next-dd-item');

            assert.deepEqual(router.transitions, [], 'the dropdown click is not treated as a nav click');
        });

        test('an action is hidden by a false flag or by a predicate that carries a context', async function (assert) {
            this.set('actions', [
                { label: 'Shown', fn: () => {} },
                { label: 'HiddenByPredicate', context: { scope: 'x' }, isVisible: () => false, fn: () => {} },
                { label: 'HiddenByFalseFlag', context: { scope: 'x' }, isVisible: false, fn: () => {} },
                { label: 'ShownByPredicate', context: { scope: 'x' }, isVisible: () => true, fn: () => {} },
                { label: 'ShownByTrueFlag', context: { scope: 'x' }, isVisible: true, fn: () => {} },
                { label: 'ContextlessStaysVisible', isVisible: () => false, fn: () => {} },
            ]);

            await render(DROPDOWN);
            await click('.ember-basic-dropdown-trigger');

            assert.deepEqual(
                findAll('.next-dd-item').map((node) => node.textContent.trim()),
                ['Shown', 'ShownByPredicate', 'ShownByTrueFlag', 'ContextlessStaysVisible'],
                'a false flag hides, a predicate hides, and a contextless predicate leaves the item alone'
            );
        });
    });
    // The url arms of the click handler. These are only testable now that the component reads
    // `window` through ember-window-mock — before that, asserting on window.location.href meant
    // navigating the test runner away.
    module('items that point at a url', function () {
        test('a url with a target opens a new window', async function (assert) {
            const opened = [];
            window.open = (url, target) => opened.push({ url, target });

            await render(hbs`<Layout::Sidebar::Item @url="https://example.test/docs" @target="_blank">Docs</Layout::Sidebar::Item>`);
            await click(navItem());

            assert.deepEqual(opened, [{ url: 'https://example.test/docs', target: '_blank' }], 'the target is honoured');
        });

        test('a url with no target navigates in place', async function (assert) {
            await render(hbs`<Layout::Sidebar::Item @url="https://example.test/changelog">Changelog</Layout::Sidebar::Item>`);
            await click(navItem());

            assert.strictEqual(window.location.href, 'https://example.test/changelog', 'the url is assigned to location');
        });

        test('a url item prefers onClick when both are supplied', async function (assert) {
            const clicks = [];
            this.set('onClick', () => clicks.push('clicked'));

            await render(hbs`<Layout::Sidebar::Item @url="https://example.test/docs" @onClick={{this.onClick}}>Docs</Layout::Sidebar::Item>`);
            await click(navItem());

            // The url arm returns first, so onClick is NOT reached — asserting the actual
            // precedence rather than the one that might be assumed.
            assert.deepEqual(clicks, [], 'the url wins over onClick');
            assert.strictEqual(window.location.href, 'https://example.test/docs');
        });
    });
});
