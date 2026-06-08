import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { click, fillIn, render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | layout/sidebar/navigator', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('items', [
            {
                label: 'Orders',
                icon: 'box',
                keywords: ['dispatch'],
                onClick: () => this.set('selected', 'orders'),
            },
            {
                label: 'Settings',
                icon: 'gear',
                children: [
                    {
                        label: 'Service Rates',
                        icon: 'file-invoice-dollar',
                        keywords: ['pricing'],
                        onClick: () => this.set('selected', 'service-rates'),
                    },
                ],
            },
        ]);
    });

    test('it replaces the root menu with a nested menu', async function (assert) {
        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);

        assert.dom('.next-sidebar-navigator-item').exists({ count: 2 });
        assert.dom('.next-sidebar-navigator').includesText('Settings');

        await click('.next-sidebar-navigator-item:nth-of-type(2)');

        assert.dom('.next-sidebar-navigator-back').hasText('Settings');
        assert.dom('.next-sidebar-navigator-item').hasText('Service Rates');

        await click('.next-sidebar-navigator-back');

        assert.dom('.next-sidebar-navigator-item').exists({ count: 2 });
        assert.dom('.next-sidebar-navigator-item').includesText('Orders');
    });

    test('it searches nested items and keeps breadcrumb context', async function (assert) {
        await render(hbs`<Layout::Sidebar::Navigator @items={{this.items}} />`);

        await fillIn('.next-sidebar-navigator-search input', 'pricing');

        assert.dom('.next-sidebar-navigator-view-title').hasText('Search results');
        assert.dom('.next-sidebar-navigator-item-label').hasText('Service Rates');
        assert.dom('.next-sidebar-navigator-item-description').hasText('Settings > Service Rates');

        await click('.next-sidebar-navigator-item');

        assert.strictEqual(this.selected, 'service-rates');
    });
});
