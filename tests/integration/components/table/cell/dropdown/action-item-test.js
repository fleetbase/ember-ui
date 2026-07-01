import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | table/cell/dropdown/action-item', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<Table::Cell::Dropdown::ActionItem />`);

        assert.dom().hasText('');

        // Template block usage:
        await render(hbs`
      <Table::Cell::Dropdown::ActionItem>
        template block text
      </Table::Cell::Dropdown::ActionItem>
    `);

        assert.dom().hasText('template block text');
    });

    test('separator obeys isVisible', async function (assert) {
        this.set('row', { id: 'row_1', shouldShowSeparator: true });
        this.set('visibleSeparator', {
            separator: true,
            isVisible(row) {
                return row.shouldShowSeparator;
            },
        });
        this.set('hiddenSeparator', {
            separator: true,
            isVisible() {
                return false;
            },
        });

        await render(hbs`<Table::Cell::Dropdown::ActionItem @columnAction={{this.visibleSeparator}} @row={{this.row}} />`);
        assert.dom('.next-dd-menu-seperator').exists('visible separator renders');

        await render(hbs`<Table::Cell::Dropdown::ActionItem @columnAction={{this.hiddenSeparator}} @row={{this.row}} />`);
        assert.dom('.next-dd-menu-seperator').doesNotExist('hidden separator does not render');
    });
});
