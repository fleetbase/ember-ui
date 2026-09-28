import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | table/cell/base', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a dash for an empty value', async function (assert) {
        await render(hbs`<Table::Cell::Base />`);

        assert.dom('span').hasText('-');
        assert.dom('div').hasAttribute('aria-label', '-', 'the accessible label mirrors the dash');
    });

    test('it renders the value and exposes it as the accessible label', async function (assert) {
        await render(hbs`<Table::Cell::Base @value="Delivered" />`);

        assert.dom('span').hasText('Delivered');
        assert.dom('div').hasAttribute('aria-label', 'Delivered');
    });

    test('it treats an empty string as absent', async function (assert) {
        await render(hbs`<Table::Cell::Base @value="" />`);

        assert.dom('span').hasText('-');
    });

    test('it renders a dash for zero and false, which the `or` fallback treats as empty', async function (assert) {
        // Documented caveat: the cell uses `{{or @value "-"}}`, so any falsy
        // value — including a meaningful numeric 0 — displays as a dash. Callers
        // that need to show 0 must pass a pre-formatted string.
        await render(hbs`<Table::Cell::Base @value={{0}} />`);
        assert.dom('span').hasText('-');

        await render(hbs`<Table::Cell::Base @value={{false}} />`);
        assert.dom('span').hasText('-');
    });

    test('it humanizes the value when the column asks for it', async function (assert) {
        this.set('column', { humanize: true });

        await render(hbs`<Table::Cell::Base @column={{this.column}} @value="in_transit" />`);

        assert.dom('span').hasText('In Transit');
    });

    test('it leaves the value untouched when humanize is off', async function (assert) {
        this.set('column', { humanize: false });

        await render(hbs`<Table::Cell::Base @column={{this.column}} @value="in_transit" />`);

        assert.dom('span').hasText('in_transit');
    });

    test('it humanizes the dash placeholder without error when the value is missing', async function (assert) {
        this.set('column', { humanize: true });

        await render(hbs`<Table::Cell::Base @column={{this.column}} />`);

        assert.dom('span').exists('an absent value still renders through the humanize branch');
    });

    test('block content replaces the value', async function (assert) {
        await render(hbs`
            <Table::Cell::Base @value="Ignored">
                <b>Custom</b>
            </Table::Cell::Base>
        `);

        assert.dom('span b').hasText('Custom');
        assert.dom('span').doesNotContainText('Ignored');
    });

    test('it applies the column cell class names', async function (assert) {
        this.set('column', { cellClassNames: 'font-bold text-right' });

        await render(hbs`<Table::Cell::Base @column={{this.column}} @value="x" />`);

        assert.dom('span').hasClass('font-bold');
        assert.dom('span').hasClass('text-right');
    });

    test('it hides the online indicator by default', async function (assert) {
        await render(hbs`<Table::Cell::Base @value="x" />`);

        assert.dom('.fa-circle').doesNotExist();
    });

    test('it shows a green indicator for an online row', async function (assert) {
        this.set('column', { showOnlineIndicator: true });
        this.set('row', { online: true });

        await render(hbs`<Table::Cell::Base @column={{this.column}} @row={{this.row}} @value="x" />`);

        assert.dom('.fa-circle').hasClass('text-green-500');
    });

    test('it shows an amber indicator for an offline row', async function (assert) {
        this.set('column', { showOnlineIndicator: true });
        this.set('row', { online: false });

        await render(hbs`<Table::Cell::Base @column={{this.column}} @row={{this.row}} @value="x" />`);

        assert.dom('.fa-circle').hasClass('text-yellow-200');
    });

    test('it reads the online flag from a custom column', async function (assert) {
        this.set('column', { showOnlineIndicator: true });
        this.set('row', { online: false, isActive: true });

        await render(hbs`<Table::Cell::Base @column={{this.column}} @row={{this.row}} @onlineColumn="isActive" @value="x" />`);

        assert.dom('.fa-circle').hasClass('text-green-500', 'the custom property is used instead of `online`');
    });
});
