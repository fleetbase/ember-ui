import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | table/cell/driver-name', function (hooks) {
    setupRenderingTest(hooks);

    test('it treats the row itself as the driver by default', async function (assert) {
        this.set('row', { name: 'Ada Lovelace', photo_url: '/img/ada.png' });
        this.set('column', {});

        await render(hbs`<Table::Cell::DriverName @row={{this.row}} @column={{this.column}} />`);

        assert.dom('a').containsText('Ada Lovelace');
        assert.dom('img').hasAttribute('src', '/img/ada.png');
        assert.dom('img').hasAttribute('alt', 'Ada Lovelace');
    });

    test('a column modelPath selects a nested driver', async function (assert) {
        this.set('row', { name: 'Order 1', driver: { name: 'Grace Hopper' } });
        this.set('column', { modelPath: 'driver' });

        await render(hbs`<Table::Cell::DriverName @row={{this.row}} @column={{this.column}} />`);

        assert.dom('a').containsText('Grace Hopper');
        assert.dom('a').doesNotContainText('Order 1');
    });

    test('a deep modelPath is resolved', async function (assert) {
        this.set('row', { assignment: { driver: { name: 'Deep Driver' } } });
        this.set('column', { modelPath: 'assignment.driver' });

        await render(hbs`<Table::Cell::DriverName @row={{this.row}} @column={{this.column}} />`);

        assert.dom('a').containsText('Deep Driver');
    });

    test('a non-string modelPath is ignored and the row is used', async function (assert) {
        this.set('row', { name: 'Row Driver' });
        this.set('column', { modelPath: 42 });

        await render(hbs`<Table::Cell::DriverName @row={{this.row}} @column={{this.column}} />`);

        assert.dom('a').containsText('Row Driver');
    });

    test('it shows the empty state when there is no driver', async function (assert) {
        this.set('row', { name: 'Order 1' });
        this.set('column', { modelPath: 'driver' });

        await render(hbs`<Table::Cell::DriverName @row={{this.row}} @column={{this.column}} />`);

        assert.dom(this.element).hasText('No driver assigned');
        assert.dom('a').doesNotExist('no link is rendered without a driver');
        assert.dom('img').doesNotExist();
    });

    test('it shows the empty state when no arguments are supplied at all', async function (assert) {
        await render(hbs`<Table::Cell::DriverName />`);

        assert.dom(this.element).hasText('No driver assigned');
    });

    test('a driver without a name renders the default-value placeholder', async function (assert) {
        this.set('row', { photo_url: '/img/x.png' });
        this.set('column', {});

        await render(hbs`<Table::Cell::DriverName @row={{this.row}} @column={{this.column}} />`);

        assert.dom('a').exists('the driver still renders even with no name');
    });

    test('the online indicator is green for an online driver and amber otherwise', async function (assert) {
        this.set('column', {});

        this.set('row', { name: 'On', online: true });
        await render(hbs`<Table::Cell::DriverName @row={{this.row}} @column={{this.column}} />`);
        assert.dom('.fa-circle').hasClass('text-green-500');

        this.set('row', { name: 'Off', online: false });
        assert.dom('.fa-circle').hasClass('text-yellow-200');
    });

    test('clicking calls onClick with the driver and the row', async function (assert) {
        const calls = [];
        this.set('row', { name: 'Order', driver: { name: 'Grace' } });
        this.set('column', { modelPath: 'driver' });
        this.set('onClick', (driver, row) => calls.push([driver, row]));

        await render(hbs`<Table::Cell::DriverName @row={{this.row}} @column={{this.column}} @onClick={{this.onClick}} />`);
        await click('a');

        assert.strictEqual(calls.length, 1);
        assert.strictEqual(calls[0][0], this.row.driver, 'the resolved driver comes first');
        assert.strictEqual(calls[0][1], this.row, 'the owning row comes second');
    });

    test('clicking fans out to column.action and column.onClick as well', async function (assert) {
        const order = [];
        this.set('row', { name: 'Ada' });
        this.set('column', {
            action: () => order.push('column.action'),
            onClick: () => order.push('column.onClick'),
        });
        this.set('onClick', () => order.push('arg.onClick'));

        await render(hbs`<Table::Cell::DriverName @row={{this.row}} @column={{this.column}} @onClick={{this.onClick}} />`);
        await click('a');

        assert.deepEqual(order, ['arg.onClick', 'column.action', 'column.onClick'], 'all three fire in declaration order');
    });

    test('clicking with no handlers does not throw', async function (assert) {
        this.set('row', { name: 'Ada' });
        this.set('column', {});

        await render(hbs`<Table::Cell::DriverName @row={{this.row}} @column={{this.column}} />`);
        await click('a');

        assert.dom('a').exists();
    });

    test('it recomputes the driver when the row changes', async function (assert) {
        this.set('column', { modelPath: 'driver' });
        this.set('row', { driver: { name: 'First' } });

        await render(hbs`<Table::Cell::DriverName @row={{this.row}} @column={{this.column}} />`);
        assert.dom('a').containsText('First');

        this.set('row', { driver: { name: 'Second' } });
        assert.dom('a').containsText('Second');
    });

    test('it forwards splattributes', async function (assert) {
        this.set('row', { name: 'Ada' });
        this.set('column', {});

        await render(hbs`<Table::Cell::DriverName @row={{this.row}} @column={{this.column}} data-test-cell="yes" />`);

        assert.dom('[data-test-cell="yes"]').exists();
    });
});
