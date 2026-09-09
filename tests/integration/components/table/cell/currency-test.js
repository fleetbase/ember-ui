import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | table/cell/currency', function (hooks) {
    setupRenderingTest(hooks);

    test('it formats the value using the row currency', async function (assert) {
        this.set('row', { currency: 'USD' });
        this.set('column', {});

        await render(hbs`<Table::Cell::Currency @row={{this.row}} @column={{this.column}} @value={{1050}} />`);

        assert.dom(this.element).containsText('$', 'the amount is rendered with the row currency symbol');
    });

    test('it falls back to the column currency when the row has none', async function (assert) {
        this.set('row', {});
        this.set('column', { currency: 'EUR' });

        await render(hbs`<Table::Cell::Currency @row={{this.row}} @column={{this.column}} @value={{1050}} />`);

        assert.dom(this.element).containsText('€');
    });

    test('the row currency wins over the column currency', async function (assert) {
        this.set('row', { currency: 'USD' });
        this.set('column', { currency: 'EUR' });

        await render(hbs`<Table::Cell::Currency @row={{this.row}} @column={{this.column}} @value={{1050}} />`);

        assert.dom(this.element).containsText('$');
        assert.dom(this.element).doesNotContainText('€');
    });

    test('it renders inside the base cell so column cell classes apply', async function (assert) {
        this.set('row', { currency: 'USD' });
        this.set('column', { cellClassNames: 'text-right' });

        await render(hbs`<Table::Cell::Currency @row={{this.row}} @column={{this.column}} @value={{100}} />`);

        assert.dom('.text-right').exists('the base cell wrapper receives the column class');
    });

    test('it renders without a currency on either side', async function (assert) {
        this.set('row', {});
        this.set('column', {});

        await render(hbs`<Table::Cell::Currency @row={{this.row}} @column={{this.column}} @value={{1050}} />`);

        assert.dom(this.element).exists('a missing currency does not crash the cell');
    });

    test('it renders with no arguments at all', async function (assert) {
        await render(hbs`<Table::Cell::Currency />`);

        assert.dom(this.element).exists();
    });

    test('it updates when the amount changes', async function (assert) {
        this.set('row', { currency: 'USD' });
        this.set('column', {});
        this.set('value', 100);

        await render(hbs`<Table::Cell::Currency @row={{this.row}} @column={{this.column}} @value={{this.value}} />`);
        const first = this.element.textContent.trim();

        this.set('value', 250000);
        assert.notStrictEqual(this.element.textContent.trim(), first, 'the formatted amount tracks the value');
    });
});
