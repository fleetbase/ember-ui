import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | table/cell/checkbox', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders unchecked by default', async function (assert) {
        await render(hbs`<Table::Cell::Checkbox />`);

        assert.dom('input[type="checkbox"]').exists();
        assert.dom('input[type="checkbox"]').isNotChecked();
    });

    test('it honours an initial checked value', async function (assert) {
        await render(hbs`<Table::Cell::Checkbox @value={{true}} />`);

        assert.dom('input[type="checkbox"]').isChecked();
    });

    test('it uses the row id as the input id when there is one', async function (assert) {
        this.set('row', { id: 'row-42' });

        await render(hbs`<Table::Cell::Checkbox @row={{this.row}} />`);

        assert.dom('input[type="checkbox"]').hasAttribute('id', 'row-42');
    });

    test('it falls back to a generated id when the row has none', async function (assert) {
        this.set('row', {});

        await render(hbs`<Table::Cell::Checkbox @row={{this.row}} />`);

        const id = find('input[type="checkbox"]').getAttribute('id');
        assert.ok(id, 'an id is still present');
        assert.true(id.length > 0, 'and it is not empty');
        assert.notStrictEqual(id, 'undefined', 'the fallback is a real guid, not a stringified undefined');
    });

    test('toggling writes `checked` onto the row', async function (assert) {
        this.set('row', { id: 'row-1' });

        await render(hbs`<Table::Cell::Checkbox @row={{this.row}} />`);
        await click('input[type="checkbox"]');

        assert.true(this.row.checked, 'the row is marked selected');
    });

    test('toggling also writes to the column value path', async function (assert) {
        this.set('row', { id: 'row-1' });
        this.set('column', { valuePath: 'isSelected' });

        await render(hbs`<Table::Cell::Checkbox @row={{this.row}} @column={{this.column}} />`);
        await click('input[type="checkbox"]');

        assert.true(this.row.isSelected, 'the configured property is set');
        assert.true(this.row.checked, 'and the generic checked flag is still set');
    });

    test('toggling twice returns the row to unchecked', async function (assert) {
        this.set('row', { id: 'row-1' });

        await render(hbs`<Table::Cell::Checkbox @row={{this.row}} />`);
        await click('input[type="checkbox"]');
        await click('input[type="checkbox"]');

        assert.false(this.row.checked);
        assert.dom('input[type="checkbox"]').isNotChecked();
    });

    test('it calls the column onToggle with the state and the row', async function (assert) {
        const calls = [];
        this.set('row', { id: 'row-1' });
        this.set('column', { onToggle: (checked, row) => calls.push([checked, row]) });

        await render(hbs`<Table::Cell::Checkbox @row={{this.row}} @column={{this.column}} />`);
        await click('input[type="checkbox"]');

        assert.deepEqual(calls, [[true, this.row]]);
    });

    test('it calls the onToggle argument with the state and the row', async function (assert) {
        const calls = [];
        this.set('row', { id: 'row-1' });
        this.set('onToggle', (checked, row) => calls.push([checked, row]));

        await render(hbs`<Table::Cell::Checkbox @row={{this.row}} @onToggle={{this.onToggle}} />`);
        await click('input[type="checkbox"]');

        assert.deepEqual(calls, [[true, this.row]]);
    });

    test('both toggle handlers fire, the column one first', async function (assert) {
        const calls = [];
        this.set('column', { onToggle: () => calls.push('column') });
        this.set('onToggle', () => calls.push('arg'));

        await render(hbs`<Table::Cell::Checkbox @column={{this.column}} @onToggle={{this.onToggle}} />`);
        await click('input[type="checkbox"]');

        assert.deepEqual(calls, ['column', 'arg']);
    });

    test('toggling without a row does not throw', async function (assert) {
        await render(hbs`<Table::Cell::Checkbox />`);
        await click('input[type="checkbox"]');

        assert.dom('input[type="checkbox"]').isChecked('the checkbox still tracks its own state');
    });

    test('it follows a later change to the value argument', async function (assert) {
        this.set('value', false);

        await render(hbs`<Table::Cell::Checkbox @value={{this.value}} />`);
        assert.dom('input[type="checkbox"]').isNotChecked();

        this.set('value', true);
        assert.dom('input[type="checkbox"]').isChecked('did-update re-syncs the tracked state');

        this.set('value', false);
        assert.dom('input[type="checkbox"]').isNotChecked();
    });

    test('a value update to undefined falls back to unchecked', async function (assert) {
        this.set('value', true);

        await render(hbs`<Table::Cell::Checkbox @value={{this.value}} />`);
        this.set('value', undefined);

        assert.dom('input[type="checkbox"]').isNotChecked('the default parameter applies on update too');
    });
});
