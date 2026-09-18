import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | table/cell/expand-arrow', function (hooks) {
    setupRenderingTest(hooks);

    test('it points right when collapsed', async function (assert) {
        await render(hbs`<Table::Cell::ExpandArrow @isExpanded={{false}} />`);

        assert.dom('.fa-chevron-right').exists('a collapsed row shows a right chevron');
        assert.dom('.fa-chevron-down').doesNotExist();
    });

    test('it points down when expanded', async function (assert) {
        await render(hbs`<Table::Cell::ExpandArrow @isExpanded={{true}} />`);

        assert.dom('.fa-chevron-down').exists('an expanded row shows a down chevron');
        assert.dom('.fa-chevron-right').doesNotExist();
    });

    test('it defaults to collapsed when the flag is omitted', async function (assert) {
        await render(hbs`<Table::Cell::ExpandArrow />`);

        assert.dom('.fa-chevron-right').exists();
    });

    test('it flips when the expanded state changes', async function (assert) {
        this.set('isExpanded', false);

        await render(hbs`<Table::Cell::ExpandArrow @isExpanded={{this.isExpanded}} />`);
        assert.dom('.fa-chevron-right').exists();

        this.set('isExpanded', true);
        assert.dom('.fa-chevron-down').exists('the icon tracks the state');
        assert.dom('.fa-chevron-right').doesNotExist();
    });

    test('it renders at the large icon size', async function (assert) {
        await render(hbs`<Table::Cell::ExpandArrow />`);

        assert.dom('svg').hasClass('fa-lg');
    });
});
