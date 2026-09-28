import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import Component from '@glimmer/component';

// <LinkToExternal> is provided by ember-engines and only resolves inside a
// mounted engine, so it is stubbed here at that boundary. The stub renders the
// route it was given so the tests can still assert the generated target.
class LinkToExternalStub extends Component {}
const LINK_TO_EXTERNAL_TEMPLATE = hbs`<a href="javascript:;" data-test-route={{@route}} ...attributes>{{yield}}</a>`;

function routerStub(transitions) {
    return class extends Service {
        transitionTo(route) {
            transitions.push(route);

            return `transitioned:${route}`;
        }
    };
}

module('Integration | Component | extensions-list', function (hooks) {
    setupRenderingTest(hooks);

    let transitions;

    hooks.beforeEach(function () {
        transitions = [];
        this.owner.unregister('service:router');
        this.owner.register('service:router', routerStub(transitions));
        this.owner.register('component:link-to-external', LinkToExternalStub);
        this.owner.register('template:components/link-to-external', LINK_TO_EXTERNAL_TEMPLATE);
    });

    test('it renders a menu with the Extensions entry even when there are no extensions', async function (assert) {
        await render(hbs`<ExtensionsList />`);

        assert.dom('[role="menu"]').exists();
        assert.dom('[role="menu"]').hasClass('next-catalog-menu-items');
        assert.strictEqual(findAll('[role="menuitem"]').length, 1, 'only the Extensions link is present');
        assert.dom('[role="menuitem"]').hasText('Extensions');
    });

    test('it renders a menu item per extension, plus the Extensions entry', async function (assert) {
        this.set('extensions', [
            { extension: 'fleet-ops', icon: 'truck' },
            { extension: 'storefront', icon: 'store' },
        ]);

        await render(hbs`<ExtensionsList @extensions={{this.extensions}} />`);

        const items = findAll('[role="menuitem"]');
        assert.strictEqual(items.length, 3, 'two extensions plus the catch-all entry');
        assert.dom(items[0]).containsText('fleet-ops');
        assert.dom(items[1]).containsText('storefront');
        assert.dom(items[2]).hasText('Extensions');
    });

    test('it applies the item class to every entry', async function (assert) {
        this.set('extensions', [{ extension: 'fleet-ops', icon: 'truck' }]);

        await render(hbs`<ExtensionsList @extensions={{this.extensions}} @itemClass="menu-item" />`);

        for (const item of findAll('[role="menuitem"]')) {
            assert.dom(item).hasClass('menu-item');
        }
    });

    test('clicking Extensions routes to the extensions console', async function (assert) {
        await render(hbs`<ExtensionsList />`);
        await click('a[role="menuitem"]');

        assert.deepEqual(transitions, ['console.extensions']);
    });

    // NOTE: `routeTo` falls back to `hostRouter` when there is no `router`
    // service, which only happens inside a mounted engine. Unregistering
    // `service:router` here breaks LinkTo for the whole test app, so that branch
    // is not covered from this rendering test.

    test('it builds an external route per extension from its dasherized name', async function (assert) {
        this.set('extensions', [{ extension: 'fleetOps', icon: 'truck' }]);

        await render(hbs`<ExtensionsList @extensions={{this.extensions}} />`);

        assert.dom('[data-test-route]').hasAttribute('data-test-route', 'console.fleet-ops', 'the camelCase name is dasherized into the route');
    });

    test('it forwards splattributes to the menu', async function (assert) {
        await render(hbs`<ExtensionsList data-test-list="yes" class="extra" />`);

        assert.dom('[role="menu"]').hasAttribute('data-test-list', 'yes');
        assert.dom('[role="menu"]').hasClass('extra');
    });

    test('it re-renders when the extension list changes', async function (assert) {
        this.set('extensions', [{ extension: 'fleet-ops', icon: 'truck' }]);
        await render(hbs`<ExtensionsList @extensions={{this.extensions}} />`);
        assert.strictEqual(findAll('[role="menuitem"]').length, 2);

        this.set('extensions', []);
        assert.strictEqual(findAll('[role="menuitem"]').length, 1, 'removing extensions removes their links');
    });

    test('it renders an extension whose icon is missing', async function (assert) {
        this.set('extensions', [{ extension: 'no-icon' }]);

        await render(hbs`<ExtensionsList @extensions={{this.extensions}} />`);

        assert.dom(findAll('[role="menuitem"]')[0]).containsText('no-icon', 'a missing icon does not stop the entry rendering');
    });
});
