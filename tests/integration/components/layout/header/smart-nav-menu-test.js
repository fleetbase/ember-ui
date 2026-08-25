import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, find, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import Component from '@glimmer/component';

// <LinkToExternal> comes from ember-engines and only resolves inside a mounted
// engine, so the nav items are given a stand-in that still renders their label.
class LinkToExternalStub extends Component {}
const LINK_TO_EXTERNAL_TEMPLATE = hbs`<a href="javascript:;" role="menuitem" data-test-route={{@route}} ...attributes>{{yield}}</a>`;

function item(id, extra = {}) {
    return { id, title: id, route: `console.${id}`, ...extra };
}

function barItems() {
    return findAll('.snm-container [role="menuitem"], .snm-container a');
}

function moreButton() {
    return find('.snm-more-btn');
}

function customiseButton() {
    return find('.snm-customise-btn');
}

module('Integration | Component | layout/header/smart-nav-menu', function (hooks) {
    setupRenderingTest(hooks);

    let headerMenuItems;
    let savedOptions;
    let deniedAbilities;
    let menuServiceHandlers;

    hooks.beforeEach(function () {
        headerMenuItems = [];
        savedOptions = {};
        deniedAbilities = new Set();
        menuServiceHandlers = [];

        // A wormhole destination for the overflow dropdown.
        const wormhole = document.createElement('div');
        wormhole.id = 'application-root-wormhole';
        document.body.appendChild(wormhole);
        this.wormhole = wormhole;

        const test = this;

        this.owner.register('component:link-to-external', LinkToExternalStub);
        this.owner.register('template:components/link-to-external', LINK_TO_EXTERNAL_TEMPLATE);

        this.owner.unregister('service:universe');
        this.owner.register(
            'service:universe',
            class extends Service {
                get headerMenuItems() {
                    return headerMenuItems;
                }

                menuService = {
                    on: (name, handler) => menuServiceHandlers.push([name, handler]),
                    off: (name, handler) => {
                        menuServiceHandlers = menuServiceHandlers.filter(([n, h]) => !(n === name && h === handler));
                    },
                };
            }
        );

        this.owner.unregister('service:currentUser');
        this.owner.register(
            'service:currentUser',
            class extends Service {
                getOption(key) {
                    return savedOptions[key];
                }

                setOption(key, value) {
                    savedOptions[key] = value;
                }
            }
        );

        this.owner.unregister('service:abilities');
        this.owner.register(
            'service:abilities',
            class extends Service {
                can(ability) {
                    return !deniedAbilities.has(ability);
                }
            }
        );

        test.savedOptions = savedOptions;
    });

    hooks.afterEach(function () {
        this.wormhole.remove();
    });

    const TEMPLATE = hbs`<Layout::Header::SmartNavMenu @maxVisible={{this.maxVisible}} @mutateMenuItems={{this.mutateMenuItems}} />`;

    module('rendering and permissions', function () {
        test('it renders an accessible menubar', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.snm-container').hasAttribute('role', 'menubar');
            assert.dom('.snm-container').hasAttribute('aria-label', 'Extension navigation');
        });

        test('with no items neither the more nor customise button renders', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.snm-more-btn').doesNotExist();
            assert.dom('.snm-customise-btn').doesNotExist();
        });

        test('with items both buttons render', async function (assert) {
            headerMenuItems = [item('fleet-ops'), item('storefront')];

            await render(TEMPLATE);

            assert.dom('.snm-more-btn').exists();
            assert.dom('.snm-customise-btn').exists();
        });

        test('items the user cannot see are filtered out', async function (assert) {
            headerMenuItems = [item('fleet-ops'), item('secret')];
            deniedAbilities.add('secret see extension');

            await render(TEMPLATE);
            await click(moreButton());

            assert.dom(this.wormhole).doesNotContainText('secret', 'a denied extension never appears');
            assert.dom(this.wormhole).containsText('fleet-ops');
        });

        test('a shortcut inherits its parent extension permission', async function (assert) {
            headerMenuItems = [item('fleet-ops'), item('shortcut-1', { _isShortcut: true, _parentId: 'fleet-ops' })];
            deniedAbilities.add('shortcut-1 see extension');

            await render(TEMPLATE);
            await click(moreButton());

            assert.dom(this.wormhole).containsText('shortcut-1', 'the shortcut is checked against its parent, not itself');
        });

        test('an ability that throws defaults the item to visible', async function (assert) {
            headerMenuItems = [item('fleet-ops')];
            this.owner.unregister('service:abilities');
            this.owner.register(
                'service:abilities',
                class extends Service {
                    can() {
                        throw new Error('no such ability');
                    }
                }
            );

            await render(TEMPLATE);

            assert.dom('.snm-customise-btn').exists('an unregistered ability does not hide the extension');
        });

        test('@mutateMenuItems can adjust the visible list', async function (assert) {
            headerMenuItems = [item('fleet-ops'), item('storefront')];
            let received = null;
            this.set('mutateMenuItems', (items) => {
                received = items;
                items.pop();
            });

            await render(TEMPLATE);

            assert.strictEqual(received.length, 1, 'the callback receives and can mutate the filtered list');
        });
    });

    module('distribution between bar and overflow', function () {
        test('with no saved preference the first maxVisible items go to the bar', async function (assert) {
            headerMenuItems = [item('a'), item('b'), item('c')];
            this.set('maxVisible', 2);

            await render(TEMPLATE);

            assert.strictEqual(barItems().length, 2, 'only maxVisible items are pinned by default');
        });

        test('a saved pinned list controls the bar in its saved order', async function (assert) {
            headerMenuItems = [item('a'), item('b'), item('c')];
            savedOptions['smart-nav-menu-prefs'] = { pinnedIds: ['c', 'a'] };

            await render(TEMPLATE);

            const labels = barItems().map((node) => node.textContent.trim());
            assert.strictEqual(barItems().length, 2, 'only the pinned items are in the bar');
            assert.true(labels[0].includes('c'), 'the saved order is respected');
        });

        test('stale ids in the saved list are skipped', async function (assert) {
            headerMenuItems = [item('a')];
            savedOptions['smart-nav-menu-prefs'] = { pinnedIds: ['gone', 'a'] };

            await render(TEMPLATE);

            assert.strictEqual(barItems().length, 1, 'an id with no matching item is ignored');
        });

        test('the pinned list is capped at maxVisible', async function (assert) {
            headerMenuItems = [item('a'), item('b'), item('c')];
            savedOptions['smart-nav-menu-prefs'] = { pinnedIds: ['a', 'b', 'c'] };
            this.set('maxVisible', 2);

            await render(TEMPLATE);

            assert.strictEqual(barItems().length, 2, 'the cap still applies to a larger saved list');
        });

        test('a malformed saved preference is ignored', async function (assert) {
            headerMenuItems = [item('a'), item('b')];
            savedOptions['smart-nav-menu-prefs'] = { pinnedIds: 'not-an-array' };

            await render(TEMPLATE);

            assert.strictEqual(barItems().length, 2, 'it falls back to the default distribution');
        });
    });

    module('overflow dropdown', function () {
        test('the more button toggles the dropdown', async function (assert) {
            headerMenuItems = [item('a')];

            await render(TEMPLATE);
            assert.dom(moreButton()).hasAttribute('aria-expanded', 'false');

            await click(moreButton());
            assert.dom(moreButton()).hasAttribute('aria-expanded', 'true');
            assert.dom(moreButton()).hasClass('is-open');

            await click(moreButton());
            assert.dom(moreButton()).hasAttribute('aria-expanded', 'false');
        });

        test('the dropdown renders into the application wormhole', async function (assert) {
            headerMenuItems = [item('a')];

            await render(TEMPLATE);
            await click(moreButton());

            assert.dom(this.wormhole).containsText('a', 'the dropdown escapes the header');
        });
    });

    module('customiser', function () {
        test('the customise button opens the panel and closes the dropdown', async function (assert) {
            headerMenuItems = [item('a')];

            await render(TEMPLATE);
            await click(moreButton());
            assert.dom(moreButton()).hasAttribute('aria-expanded', 'true');

            await click(customiseButton());

            assert.dom(moreButton()).hasAttribute('aria-expanded', 'false', 'opening the customiser closes the dropdown');
        });
    });

    module('preferences', function () {
        test('a missing preference store does not break rendering', async function (assert) {
            headerMenuItems = [item('a')];
            this.owner.unregister('service:currentUser');
            this.owner.register(
                'service:currentUser',
                class extends Service {
                    getOption() {
                        throw new Error('unavailable');
                    }

                    setOption() {
                        throw new Error('unavailable');
                    }
                }
            );

            await render(TEMPLATE);

            assert.dom('.snm-container').exists('preference failures are non-fatal');
        });
    });

    test('it subscribes to menu registrations and unsubscribes on teardown', async function (assert) {
        headerMenuItems = [item('a')];
        this.set('show', true);

        await render(hbs`{{#if this.show}}<Layout::Header::SmartNavMenu />{{/if}}`);
        assert.strictEqual(menuServiceHandlers.length, 1, 'it listens for newly registered menu items');

        this.set('show', false);
        await settled();

        assert.strictEqual(menuServiceHandlers.length, 0, 'the listener is removed on destroy');
    });

    // _onMenuItemRegistered redistributes only for the 'header' registry. Registrations for any
    // other registry — the sidebar's, for instance — must be ignored, or every unrelated menu
    // registration in the app would trigger a re-layout of the header bar.
    test('a registration for another registry is ignored', async function (assert) {
        headerMenuItems = [item('a')];

        await render(hbs`<Layout::Header::SmartNavMenu />`);
        const [, handler] = menuServiceHandlers[0];

        headerMenuItems = [item('a'), item('b')];
        handler({ id: 'b' }, 'sidebar');
        await settled();

        assert.deepEqual(
            barItems().map((node) => node.textContent.trim()),
            ['a'],
            'the header bar is untouched'
        );

        handler({ id: 'b' }, 'header');
        await settled();

        assert.strictEqual(barItems().length, 2, 'but a header registration does redistribute');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<Layout::Header::SmartNavMenu data-test-nav="yes" />`);

        assert.dom('.snm-container').hasAttribute('data-test-nav', 'yes');
    });

    // -------------------------------------------------------------------------
    // Appended coverage: the More dropdown, the customiser panel and quick-pin.
    // -------------------------------------------------------------------------

    const PREFS_KEY = 'smart-nav-menu-prefs';

    // The overflow dropdown is wormholed to #application-root-wormhole on document.body, so it
    // is outside the test root that `find`/`findAll` search. Query the wormhole directly.
    function dropdown(context) {
        return context.wormhole.querySelector('.snm-dropdown');
    }

    function inDropdown(context, selector) {
        return context.wormhole.querySelector(selector);
    }

    function pinButtons(context) {
        return Array.from(context.wormhole.querySelectorAll('.snm-dropdown-pin-btn'));
    }

    function customizerPanel() {
        return find('.snm-customizer-panel');
    }

    module('the more dropdown', function () {
        test('it opens and closes from the more button', async function (assert) {
            headerMenuItems = [item('fleet-ops'), item('storefront')];

            await render(TEMPLATE);
            assert.strictEqual(dropdown(this), null, 'the dropdown starts closed');

            await click(moreButton());
            assert.ok(dropdown(this), 'the dropdown opens');
            assert.dom(moreButton()).hasClass('is-open', 'and the button is marked');

            await click(moreButton());
            assert.strictEqual(dropdown(this), null, 'clicking again closes it');
        });

        test('the dropdown close control closes it', async function (assert) {
            headerMenuItems = [item('fleet-ops')];

            await render(TEMPLATE);
            await click(moreButton());
            await click(inDropdown(this, '.snm-dropdown-close'));

            assert.strictEqual(dropdown(this), null);
        });
    });

    module('the customiser panel', function () {
        test('it opens from the customise button and closes again', async function (assert) {
            headerMenuItems = [item('fleet-ops'), item('storefront')];

            await render(TEMPLATE);
            assert.strictEqual(customizerPanel(), null, 'the panel starts closed');

            await click(customiseButton());
            assert.ok(customizerPanel(), 'the panel opens');

            await click('.snm-customizer-close');
            assert.strictEqual(customizerPanel(), null, 'and closes without saving');
        });

        test('opening the customiser closes the more dropdown', async function (assert) {
            headerMenuItems = [item('fleet-ops'), item('storefront')];

            await render(TEMPLATE);
            await click(moreButton());
            assert.ok(dropdown(this));

            await click(customiseButton());

            assert.strictEqual(dropdown(this), null, 'only one panel is open at a time');
            assert.ok(customizerPanel());
        });

        test('applying a selection saves it and closes the panel', async function (assert) {
            headerMenuItems = [item('fleet-ops'), item('storefront'), item('iam')];

            await render(TEMPLATE);
            await click(customiseButton());
            await click('.snm-btn-primary');

            assert.strictEqual(customizerPanel(), null, 'the panel closes');
            assert.ok(savedOptions[PREFS_KEY], 'the preference is persisted');
            assert.true(Array.isArray(savedOptions[PREFS_KEY].pinnedIds), 'as an ordered id list');
        });

        test('cancelling the customiser saves nothing', async function (assert) {
            headerMenuItems = [item('fleet-ops'), item('storefront')];

            await render(TEMPLATE);
            await click(customiseButton());
            await click('.snm-btn-secondary');

            assert.strictEqual(customizerPanel(), null);
            assert.notOk(savedOptions[PREFS_KEY], 'nothing is written');
        });
    });

    module('quick-pinning from the dropdown', function () {
        test('an overflow item can be pinned straight from the dropdown', async function (assert) {
            headerMenuItems = [item('fleet-ops'), item('storefront'), item('iam')];
            this.set('maxVisible', 5);

            await render(TEMPLATE);
            await click(moreButton());

            assert.true(pinButtons(this).length > 0, 'a pin control is offered while there is room');

            await click(pinButtons(this)[0]);

            assert.ok(savedOptions[PREFS_KEY], 'the pin is persisted');
            assert.true(savedOptions[PREFS_KEY].pinnedIds.length > 0);
        });

        // The dropdown lists every item and keeps its pin button, so the same item can be
        // pinned twice from the UI — quickPin guards against the duplicate itself.
        test('pinning the same item twice adds it only once', async function (assert) {
            headerMenuItems = [item('fleet-ops'), item('storefront')];
            this.set('maxVisible', 5);

            await render(TEMPLATE);
            await click(moreButton());

            // quickPin leaves the dropdown open, so the same button can be pressed again.
            await click(pinButtons(this)[0]);
            const afterFirst = [...savedOptions[PREFS_KEY].pinnedIds];
            assert.strictEqual(afterFirst.length, 1, 'the first press pins one id');

            await click(pinButtons(this)[0]);

            assert.deepEqual(savedOptions[PREFS_KEY].pinnedIds, afterFirst, 'the second press is a no-op');
        });

        test('no pin control is offered once the bar is full', async function (assert) {
            headerMenuItems = [item('fleet-ops'), item('storefront'), item('iam')];
            this.set('maxVisible', 1);
            savedOptions[PREFS_KEY] = { pinnedIds: ['fleet-ops'] };

            await render(TEMPLATE);
            await click(moreButton());

            assert.deepEqual(pinButtons(this), [], 'the pin button is hidden at the limit');
        });
    });

    // The component subscribes to two event sources it cannot reach through the DOM: the universe
    // menu service, and the router. Both stubs record their handlers, so the events can be fired
    // directly rather than simulated.
    module('reacting to events from outside the component', function () {
        function registrationHandler() {
            const [, handler] = menuServiceHandlers.find(([name]) => name === 'menuItem.registered') ?? [];
            return handler;
        }

        test('a menu item registered into the header registry triggers a redistribution', async function (assert) {
            headerMenuItems = [item('fleet-ops')];

            await render(TEMPLATE);
            assert.strictEqual(barItems().length, 1, 'one item to begin with');

            headerMenuItems = [item('fleet-ops'), item('storefront')];
            registrationHandler()(item('storefront'), 'header');
            await settled();

            assert.strictEqual(barItems().length, 2, 'the newly registered item appears');
        });

        test('a route transition closes the overflow dropdown', async function (assert) {
            const routerHandlers = [];
            this.owner.unregister('service:router');
            this.owner.register(
                'service:router',
                class extends Service {
                    on(name, handler) {
                        routerHandlers.push([name, handler]);
                    }
                    off() {}
                }
            );

            headerMenuItems = [item('fleet-ops'), item('storefront')];
            this.set('maxVisible', 1);

            await render(TEMPLATE);
            await click(moreButton());
            assert.dom(moreButton()).hasAttribute('aria-expanded', 'true', 'the dropdown is open');

            const [, onRouteDidChange] = routerHandlers.find(([name]) => name === 'routeDidChange') ?? [];
            assert.ok(onRouteDidChange, 'the component subscribed to route changes');

            onRouteDidChange();
            await settled();

            assert.dom(moreButton()).hasAttribute('aria-expanded', 'false', 'navigating away closes it');
        });
    });

    module('the more button and the customiser are mutually exclusive', function () {
        test('opening the dropdown closes an open customiser', async function (assert) {
            headerMenuItems = [item('fleet-ops'), item('storefront')];
            this.set('maxVisible', 1);

            await render(TEMPLATE);
            await click(customiseButton());
            assert.dom('.snm-customizer-panel').exists('the customiser is open');

            await click(moreButton());

            assert.dom('.snm-customizer-panel').doesNotExist('opening the dropdown closes it again');
            assert.dom(moreButton()).hasAttribute('aria-expanded', 'true');
        });
    });
});
