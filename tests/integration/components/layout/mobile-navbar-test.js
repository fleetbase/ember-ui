import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import Evented from '@ember/object/evented';
import Component from '@glimmer/component';

// <LinkToExternal> is provided by ember-engines and only resolves inside a mounted engine, so it is
// stubbed here at that boundary. The stub renders the route it was given so the tests can still
// assert the generated target.
class LinkToExternalStub extends Component {}
const LINK_TO_EXTERNAL_TEMPLATE = hbs`<a href="javascript:;" data-test-route={{@route}} ...attributes>{{yield}}</a>`;

const NAVBAR = '.next-mobile-navbar';

class MobileMediaStub extends Service.extend(Evented) {
    isMobile = true;
}

class DesktopMediaStub extends Service.extend(Evented) {
    isMobile = false;
}

function menuItems() {
    return [
        { id: 'fleet-ops', title: 'Operations', icon: 'route', route: 'console.fleet-ops' },
        { id: 'storefront', title: 'Storefront', icon: 'store', route: 'console.storefront', class: 'my-item' },
    ];
}

module('Integration | Component | layout/mobile-navbar', function (hooks) {
    setupRenderingTest(hooks);

    let sidebar;
    let universe;

    hooks.beforeEach(function () {
        this.owner.unregister('service:media');
        this.owner.register('service:media', MobileMediaStub);
        this.owner.register('component:link-to-external', LinkToExternalStub);
        this.owner.register('template:components/link-to-external', LINK_TO_EXTERNAL_TEMPLATE);

        universe = this.owner.lookup('service:universe');
        universe.headerMenuItems = [];

        sidebar = this.owner.lookup('service:sidebar');
        // isVisible is a derived getter — drive the service through its own API.
        sidebar.setVisualState('visible');

        this.set('menuItems', menuItems());
    });

    module('on mobile', function () {
        test('it renders a menubar with the supplied items', async function (assert) {
            await render(hbs`<Layout::MobileNavbar @menuItems={{this.menuItems}} />`);

            assert.dom(NAVBAR).exists();
            assert.dom('[role="menubar"]').exists();
            assert.deepEqual(
                findAll('.scrollable-nav-items .next-mobile-navbar-tab-item span').map((node) => node.textContent.trim()),
                ['Operations', 'Storefront']
            );
        });

        test('each item renders its icon, route and extra class', async function (assert) {
            await render(hbs`<Layout::MobileNavbar @menuItems={{this.menuItems}} />`);

            const items = findAll('.scrollable-nav-items .next-mobile-navbar-tab-item');
            assert.dom(items[0].querySelector('svg')).hasClass('fa-route');
            assert.dom(items[0]).hasAttribute('data-test-route', 'console.fleet-ops');
            assert.dom(items[1]).hasClass('my-item');
        });

        test('a menu toggle is always rendered last', async function (assert) {
            await render(hbs`<Layout::MobileNavbar @menuItems={{this.menuItems}} />`);

            assert.dom('.menu-toggle').containsText('Menu');
            assert.dom('.menu-toggle svg').hasClass('fa-bars');
        });

        test('no menu items renders just the toggle', async function (assert) {
            await render(hbs`<Layout::MobileNavbar />`);

            assert.deepEqual(findAll('.scrollable-nav-items .next-mobile-navbar-tab-item'), []);
            assert.dom('.menu-toggle').exists();
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<Layout::MobileNavbar @menuItems={{this.menuItems}} class="fixed" data-test-navbar="yes" />`);

            assert.dom(NAVBAR).hasClass('fixed');
            assert.dom(NAVBAR).hasAttribute('data-test-navbar', 'yes');
        });
    });

    test('it renders nothing on a desktop', async function (assert) {
        this.owner.unregister('service:media');
        this.owner.register('service:media', DesktopMediaStub);

        await render(hbs`<Layout::MobileNavbar @menuItems={{this.menuItems}} />`);

        assert.dom(NAVBAR).doesNotExist();
        assert.dom(this.element).hasText('');
    });

    module('merging registered extensions', function () {
        test('registered header menu items the user can see are listed first', async function (assert) {
            universe.headerMenuItems = [{ id: 'fleet-ops', title: 'Registered', icon: 'route', route: 'console.registered' }];

            this.owner.unregister('service:abilities');
            this.owner.register(
                'service:abilities',
                class extends Service {
                    can() {
                        return true;
                    }
                }
            );

            await render(hbs`<Layout::MobileNavbar @menuItems={{this.menuItems}} />`);

            assert.deepEqual(
                findAll('.scrollable-nav-items .next-mobile-navbar-tab-item span').map((node) => node.textContent.trim()),
                ['Registered', 'Operations', 'Storefront'],
                'registered items precede the explicitly supplied ones'
            );
        });

        test('a registered item the user cannot see is filtered out', async function (assert) {
            universe.headerMenuItems = [{ id: 'fleet-ops', title: 'Hidden', icon: 'route', route: 'console.hidden' }];

            this.owner.unregister('service:abilities');
            this.owner.register(
                'service:abilities',
                class extends Service {
                    can() {
                        return false;
                    }
                }
            );

            await render(hbs`<Layout::MobileNavbar @menuItems={{this.menuItems}} />`);

            assert.deepEqual(
                findAll('.scrollable-nav-items .next-mobile-navbar-tab-item span').map((node) => node.textContent.trim()),
                ['Operations', 'Storefront']
            );
        });

        test('mutateMenuItems is offered the supplied items before they are merged', async function (assert) {
            const seen = [];
            this.set('mutateMenuItems', (items) => seen.push(items));

            await render(hbs`<Layout::MobileNavbar @menuItems={{this.menuItems}} @mutateMenuItems={{this.mutateMenuItems}} />`);

            assert.strictEqual(seen.length, 1);
            assert.deepEqual(
                seen[0].map((item) => item.title),
                ['Operations', 'Storefront']
            );
        });
    });

    module('the sidebar', function () {
        // The real router service cannot transition to a console route inside a rendering test, so
        // both branches of routeTo() are driven through a stub. `on`/`off` are required because the
        // component subscribes to routeDidChange in its constructor.
        function routerStub(transitions, { fail = false } = {}) {
            return class extends Service {
                on() {}
                off() {}
                transitionTo(route) {
                    transitions.push(route);
                    return fail ? Promise.reject(new Error(`no route ${route}`)) : Promise.resolve(route);
                }
            };
        }

        test('onSetup hands the component back so the sidebar can be driven', async function (assert) {
            let navbar;
            this.set('onSetup', (component) => {
                navbar = component;
            });

            await render(hbs`<Layout::MobileNavbar @menuItems={{this.menuItems}} @onSetup={{this.onSetup}} />`);

            assert.ok(navbar, 'the component is handed back');
            assert.true(navbar.isSidebarOpen(), 'the sidebar reports itself visible');

            navbar.closeSidebar();
            assert.false(sidebar.isVisible, 'closeSidebar hides it');
            assert.false(navbar.isSidebarOpen(), 'and the component agrees');

            navbar.openSidebar();
            assert.true(sidebar.isVisible, 'openSidebar shows it again');
        });

        test('pressing the toggle flips the sidebar', async function (assert) {
            await render(hbs`<Layout::MobileNavbar @menuItems={{this.menuItems}} />`);

            await click('.menu-toggle');
            assert.false(sidebar.isVisible, 'the visible sidebar is hidden');

            await click('.menu-toggle');
            assert.true(sidebar.isVisible, 'and shown again');
        });

        // The component closes the sidebar behind any route change, not only the ones it starts
        // itself — but only on a mobile viewport, where the sidebar is an overlay.
        test('a route change from anywhere closes the sidebar on mobile', async function (assert) {
            const listeners = [];
            this.owner.unregister('service:router');
            this.owner.register(
                'service:router',
                class extends Service {
                    on(name, handler) {
                        listeners.push([name, handler]);
                    }
                    off() {}
                }
            );

            await render(hbs`<Layout::MobileNavbar @menuItems={{this.menuItems}} />`);
            assert.true(sidebar.isVisible, 'the sidebar starts open');

            const [, routeDidChange] = listeners.find(([name]) => name === 'routeDidChange');
            routeDidChange();
            await settled();

            assert.false(sidebar.isVisible, 'navigating anywhere closes it');
        });

        test('a route change on a desktop viewport leaves the sidebar alone', async function (assert) {
            const listeners = [];
            this.owner.unregister('service:media');
            this.owner.register('service:media', DesktopMediaStub);
            this.owner.unregister('service:router');
            this.owner.register(
                'service:router',
                class extends Service {
                    on(name, handler) {
                        listeners.push([name, handler]);
                    }
                    off() {}
                }
            );

            await render(hbs`<Layout::MobileNavbar @menuItems={{this.menuItems}} />`);
            assert.true(sidebar.isVisible, 'the sidebar starts open');

            const [, routeDidChange] = listeners.find(([name]) => name === 'routeDidChange');
            routeDidChange();
            await settled();

            assert.true(sidebar.isVisible, 'a desktop sidebar is not an overlay, so it stays put');
        });

        test('routing to a menu item transitions and closes the sidebar', async function (assert) {
            const transitions = [];
            let navbar;
            this.owner.unregister('service:router');
            this.owner.register('service:router', routerStub(transitions));
            this.set('onSetup', (component) => {
                navbar = component;
            });

            await render(hbs`<Layout::MobileNavbar @menuItems={{this.menuItems}} @onSetup={{this.onSetup}} />`);

            await navbar.routeTo('console.fleet-ops');
            await settled();

            assert.deepEqual(transitions, ['console.fleet-ops']);
            assert.false(sidebar.isVisible, 'the sidebar is closed behind the transition');
        });

        test('a failed transition leaves the sidebar alone', async function (assert) {
            const transitions = [];
            let navbar;
            this.owner.unregister('service:router');
            this.owner.register('service:router', routerStub(transitions, { fail: true }));
            this.set('onSetup', (component) => {
                navbar = component;
            });

            await render(hbs`<Layout::MobileNavbar @menuItems={{this.menuItems}} @onSetup={{this.onSetup}} />`);

            await navbar.routeTo('console.does-not-exist');
            await settled();

            assert.deepEqual(transitions, ['console.does-not-exist'], 'the transition was attempted');
            assert.true(sidebar.isVisible, 'the sidebar stays as it was');
        });
    });
});
