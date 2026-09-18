import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | table/cell/anchor', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a dash when there is no value and no anchor text', async function (assert) {
        await render(hbs`<Table::Cell::Anchor />`);

        assert.dom('a').hasText('-', 'an empty cell is rendered as a dash rather than blank');
    });

    test('it renders the value when one is supplied', async function (assert) {
        await render(hbs`<Table::Cell::Anchor @value="ORD-1234" />`);

        assert.dom('a').hasText('ORD-1234');
    });

    test('it falls back to the column anchorText', async function (assert) {
        this.set('column', { anchorText: 'Open' });

        await render(hbs`<Table::Cell::Anchor @column={{this.column}} />`);

        assert.dom('a').hasText('Open');
    });

    test('the value takes precedence over anchorText', async function (assert) {
        this.set('column', { anchorText: 'Fallback' });

        await render(hbs`<Table::Cell::Anchor @column={{this.column}} @value="Actual" />`);

        assert.dom('a').hasText('Actual');
    });

    test('block content replaces the value entirely', async function (assert) {
        this.set('column', { anchorText: 'Fallback' });

        await render(hbs`
            <Table::Cell::Anchor @column={{this.column}} @value="Ignored">
                <b>Block</b>
            </Table::Cell::Anchor>
        `);

        assert.dom('a b').hasText('Block');
        assert.dom('a').doesNotContainText('Ignored');
    });

    test('it applies the column anchor and span classes', async function (assert) {
        this.set('column', { anchorClass: 'text-blue-500', anchorSpanClass: 'font-bold' });

        await render(hbs`<Table::Cell::Anchor @column={{this.column}} @value="x" />`);

        assert.dom('a').hasClass('text-blue-500');
        assert.dom('a span').hasClass('font-bold');
    });

    test('it renders an icon only when the column supplies one', async function (assert) {
        await render(hbs`<Table::Cell::Anchor @value="x" />`);
        assert.dom('.btn-icon-wrapper').doesNotExist('no icon by default');

        this.set('column', { anchorIcon: 'pen', anchorIconPrefix: 'fas', anchorIconClass: 'mr-1' });
        await render(hbs`<Table::Cell::Anchor @column={{this.column}} @value="x" />`);

        assert.dom('.btn-icon-wrapper').exists();
        assert.dom('.btn-icon-wrapper').hasAttribute('data-icon-prefix', 'fas');
        assert.dom('.btn-icon-wrapper svg').hasClass('mr-1');
    });

    test('clicking calls the column action with the row', async function (assert) {
        const calls = [];
        this.set('row', { id: 'row-1' });
        this.set('column', { action: (row) => calls.push(row) });

        await render(hbs`<Table::Cell::Anchor @row={{this.row}} @column={{this.column}} />`);
        await click('a');

        assert.deepEqual(calls, [this.row]);
    });

    test('clicking calls the column onClick with the row', async function (assert) {
        const calls = [];
        this.set('row', { id: 'row-1' });
        this.set('column', { onClick: (row) => calls.push(row) });

        await render(hbs`<Table::Cell::Anchor @row={{this.row}} @column={{this.column}} />`);
        await click('a');

        assert.deepEqual(calls, [this.row]);
    });

    test('clicking calls both handlers, action first', async function (assert) {
        const calls = [];
        this.set('column', {
            action: () => calls.push('action'),
            onClick: () => calls.push('onClick'),
        });

        await render(hbs`<Table::Cell::Anchor @column={{this.column}} />`);
        await click('a');

        assert.deepEqual(calls, ['action', 'onClick']);
    });

    test('clicking is inert when the column supplies no handlers', async function (assert) {
        this.set('column', { action: 'not-a-function', onClick: null });

        await render(hbs`<Table::Cell::Anchor @column={{this.column}} />`);
        await click('a');

        assert.dom('a').exists('non-function handlers are ignored rather than invoked');
    });

    test('clicking with no column at all does not throw', async function (assert) {
        await render(hbs`<Table::Cell::Anchor />`);
        await click('a');

        assert.dom('a').exists();
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<Table::Cell::Anchor @value="x" data-test-anchor="yes" />`);

        assert.dom('a').hasAttribute('data-test-anchor', 'yes');
    });
});
