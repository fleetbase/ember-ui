import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Component from '@glimmer/component';
import Service from '@ember/service';

// <LinkToExternal> comes from ember-engines and only resolves inside a mounted engine.
class LinkToExternalStub extends Component {}
const LINK_TO_EXTERNAL_TEMPLATE = hbs`<a href="javascript:;" data-test-route={{@route}} ...attributes>{{yield}}</a>`;

const ITEM = '.snm-item';

module('Integration | Component | layout/header/smart-nav-menu/item', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('component:link-to-external', LinkToExternalStub);
        this.owner.register('template:components/link-to-external', LINK_TO_EXTERNAL_TEMPLATE);
    });

    function stubRouter(owner, currentRouteName) {
        owner.unregister('service:router');
        owner.register(
            'service:router',
            class extends Service {
                currentRouteName = currentRouteName;
                on() {}
                off() {}
            }
        );
    }

    module('a route-backed item', function () {
        test('it renders as a link carrying the route, title and generated id', async function (assert) {
            this.set('item', { id: 'fleet-ops', title: 'Fleet Ops', route: 'console.fleet-ops' });

            await render(hbs`<Layout::Header::SmartNavMenu::Item @item={{this.item}} />`);

            assert.dom(ITEM).exists();
            assert.dom(ITEM).hasAttribute('data-test-route', 'console.fleet-ops');
            assert.dom(ITEM).hasAttribute('title', 'Fleet Ops');
            // `dasherize` does not touch the dots in a route name, so the id keeps them.
            assert.dom(ITEM).hasAttribute('id', 'console.fleet-ops-header-button');
            assert.dom(ITEM).hasAttribute('role', 'menuitem');
            assert.dom(ITEM).includesText('Fleet Ops');
        });

        test('an item with no route or id falls back to a generic id', async function (assert) {
            this.set('item', { title: 'Nameless' });

            await render(hbs`<Layout::Header::SmartNavMenu::Item @item={{this.item}} />`);

            assert.dom(ITEM).hasAttribute('id', 'nav-header-button');
        });

        test('an extra class from the item is applied', async function (assert) {
            this.set('item', { id: 'fleet-ops', title: 'Fleet Ops', route: 'console.fleet-ops', class: 'is-featured' });

            await render(hbs`<Layout::Header::SmartNavMenu::Item @item={{this.item}} />`);

            assert.dom(ITEM).hasClass('is-featured');
        });
    });

    module('the active state', function () {
        test('an item whose route prefixes the current route is active', async function (assert) {
            stubRouter(this.owner, 'console.fleet-ops.orders.index');
            this.set('item', { id: 'fleet-ops', title: 'Fleet Ops', route: 'console.fleet-ops' });

            await render(hbs`<Layout::Header::SmartNavMenu::Item @item={{this.item}} />`);

            assert.dom(ITEM).hasClass('active');
        });

        test('an item pointing elsewhere is not', async function (assert) {
            stubRouter(this.owner, 'console.storefront.index');
            this.set('item', { id: 'fleet-ops', title: 'Fleet Ops', route: 'console.fleet-ops' });

            await render(hbs`<Layout::Header::SmartNavMenu::Item @item={{this.item}} />`);

            assert.dom(ITEM).doesNotHaveClass('active');
        });

        test('an item with no route is never active', async function (assert) {
            stubRouter(this.owner, 'console.fleet-ops.orders.index');
            this.set('item', { id: 'fleet-ops', title: 'Fleet Ops', onClick: () => {} });

            await render(hbs`<Layout::Header::SmartNavMenu::Item @item={{this.item}} />`);

            assert.dom(ITEM).doesNotHaveClass('active', 'there is no route to compare against');
        });
    });

    module('icons', function () {
        test('an item with no icon falls back to a neutral dot', async function (assert) {
            this.set('item', { id: 'fleet-ops', title: 'Fleet Ops', route: 'console.fleet-ops' });

            await render(hbs`<Layout::Header::SmartNavMenu::Item @item={{this.item}} />`);

            assert.dom(`${ITEM} .fa-circle-dot`).exists();
        });

        test('a declared icon is used instead', async function (assert) {
            this.set('item', { id: 'fleet-ops', title: 'Fleet Ops', route: 'console.fleet-ops', icon: 'truck' });

            await render(hbs`<Layout::Header::SmartNavMenu::Item @item={{this.item}} />`);

            assert.dom(`${ITEM} .fa-truck`).exists();
            assert.dom(`${ITEM} .fa-circle-dot`).doesNotExist();
        });
    });

    module('an onClick item', function () {
        test('it renders as a plain anchor and reports clicks', async function (assert) {
            const clicks = [];
            this.set('item', { id: 'invite', title: 'Invite', onClick: () => clicks.push('invite') });

            await render(hbs`<Layout::Header::SmartNavMenu::Item @item={{this.item}} />`);

            assert.dom(ITEM).hasAttribute('href', 'javascript:;');
            assert.dom(ITEM).doesNotHaveAttribute('data-test-route', 'the route link is not used');

            await click(ITEM);

            assert.deepEqual(clicks, ['invite']);
        });

        test('an onClick item that also has a route keeps the route in its id', async function (assert) {
            this.set('item', { id: 'invite', title: 'Invite', route: 'console.invite', onClick: () => {} });

            await render(hbs`<Layout::Header::SmartNavMenu::Item @item={{this.item}} />`);

            assert.dom(ITEM).hasAttribute('id', 'console.invite-header-button');
        });
    });

    test('it renders with no item argument at all', async function (assert) {
        await render(hbs`<Layout::Header::SmartNavMenu::Item />`);

        assert.ok(find(ITEM), 'a missing item is not a crash');
    });
});
