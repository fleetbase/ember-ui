import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | aside-item-scroller', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('items', [{ name: 'Alpha' }, { name: 'Avocado' }, { name: 'Bravo' }]);
    });

    test('it groups items by the first letter of the title key', async function (assert) {
        await render(hbs`
            <AsideItemScroller @items={{this.items}} @titleKey="name" as |item|>
                <span data-test-item>{{item.name}}</span>
            </AsideItemScroller>
        `);

        assert.dom('[role="menu"] h2').hasText('Directory');
        assert.dom('[role="menu"]').includesText('Search 3 items');
        assert.dom('[role="menu"] h3').exists({ count: 2 });

        const letters = [...this.element.querySelectorAll('[role="menu"] h3')].map((el) => el.textContent.trim());
        assert.deepEqual(letters, ['A', 'B']);

        const names = [...this.element.querySelectorAll('[role="menu"] [data-test-item]')].map((el) => el.textContent.trim());
        assert.deepEqual(names, ['Alpha', 'Avocado', 'Bravo']);
    });

    // An item whose title key resolves to nothing used to take the whole list down with it —
    // the guard sat one line below the dereference. See DEFECTS #29.
    test('an item with no title is skipped rather than fatal', async function (assert) {
        this.set('items', [{ name: 'Alpha' }, { name: undefined }, { name: 'Bravo' }]);

        await render(hbs`
            <AsideItemScroller @items={{this.items}} @titleKey="name" as |item|>
                <span data-test-item>{{item.name}}</span>
            </AsideItemScroller>
        `);

        const letters = [...this.element.querySelectorAll('[role="menu"] h3')].map((el) => el.textContent.trim());
        assert.deepEqual(letters, ['A', 'B'], 'the titled items are still grouped');
        assert.dom('[role="menu"] [data-test-item]').exists({ count: 2 }, 'and the untitled one is simply left out');
    });

    test('a create button with no handler behind it is inert', async function (assert) {
        await render(hbs`<AsideItemScroller @items={{this.items}} @titleKey="name" @resource="driver" @title="Drivers" />`);

        assert.dom('[role="menu"] h2').hasText('Drivers');
        assert.dom('[role="menu"] .btn-wrapper button').doesNotExist('no create button without a handler');
    });

    test('it lists grouped items in the mobile dropdown', async function (assert) {
        await render(hbs`
            <AsideItemScroller @items={{this.items}} @titleKey="name" as |item|>
                <span data-test-item>{{item.name}}</span>
            </AsideItemScroller>
        `);

        assert.dom('[role="menubar"]').includesText('3 items');
        assert.dom('.next-dd-menu').doesNotExist();

        await click('[role="menubar"] .ember-basic-dropdown-trigger');

        assert.dom('.next-dd-menu [role="menuitem"]').exists({ count: 3 });
        assert.dom('.next-dd-menu').includesText('Alpha');
        assert.dom('.next-dd-menu').includesText('Bravo');
    });

    test('it shows an empty state when there are no items', async function (assert) {
        this.set('items', []);

        await render(hbs`<AsideItemScroller @items={{this.items}} @titleKey="name" @resource="driver" />`);

        assert.dom('[role="menu"]').includesText('Search 0 drivers');
        assert.dom('[role="menu"] h4').hasText('No drivers');
    });

    test('it renders a create button when @onCreate is provided', async function (assert) {
        let created = 0;
        this.set('onCreate', () => created++);

        await render(hbs`<AsideItemScroller @items={{this.items}} @titleKey="name" @resource="driver" @title="Drivers" @onCreate={{this.onCreate}} />`);

        assert.dom('[role="menu"] h2').hasText('Drivers');
        assert.dom('[role="menu"] .btn-wrapper button').includesText('Create driver');

        await click('[role="menu"] .btn-wrapper button');

        assert.strictEqual(created, 1, 'clicking the create button invokes @onCreate');
    });

    test('it calls @onInit with the component instance and exposes power select groups', async function (assert) {
        let instance = null;
        this.set('onInit', (component) => (instance = component));

        await render(hbs`<AsideItemScroller @items={{this.items}} @titleKey="name" @onInit={{this.onInit}} />`);

        assert.ok(instance, 'component instance was provided to @onInit');
        assert.deepEqual(
            instance.powerSelectGrouped.map((group) => ({ groupName: group.groupName, count: group.options.length })),
            [
                { groupName: 'A', count: 2 },
                { groupName: 'B', count: 1 },
            ]
        );
    });
});
