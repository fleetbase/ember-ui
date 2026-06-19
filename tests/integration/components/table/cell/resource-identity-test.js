import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { click, render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | table/cell/resource-identity', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a compact resource identity from column paths', async function (assert) {
        this.set('row', {
            name: 'Truck 104',
            public_id: 'vehicle_123',
            plate_number: 'ABC-123',
            status: 'available',
            online: true,
            photo_url: 'https://example.com/truck.png',
        });
        this.set('column', {
            label: 'Name',
            labelPath: 'name',
            mediaPath: 'photo_url',
            identifierPath: 'public_id',
            statusPath: 'status',
            onlinePath: 'online',
            metaPaths: ['plate_number'],
        });

        await render(hbs`<Table::Cell::ResourceIdentity @row={{this.row}} @column={{this.column}} />`);

        assert.dom('.table-cell-resource-identity').exists();
        assert.dom('[data-test-resource-identity-image]').hasAttribute('src', 'https://example.com/truck.png');
        assert.dom('button').hasClass('items-start');
        assert.dom('button').doesNotHaveClass('py-0.5');
        assert.dom('[data-test-resource-identity-image]').hasClass('h-7');
        assert.dom('[data-test-resource-identity-image]').hasClass('w-7');
        assert.dom('[data-test-resource-identity-image]').hasClass('border');
        assert.dom('[data-test-resource-identity-image]').hasClass('rounded-md');
        assert.dom('[data-test-resource-identity-image]').hasClass('shadow-sm');
        assert.dom('[data-test-resource-identity-image]').hasClass('dark:border-gray-700');
        assert.dom('[data-test-resource-identity-status-dot]').hasClass('fa-2xs');
        assert.dom('[data-test-resource-identity-status-dot]').hasClass('left-0');
        assert.dom('[data-test-resource-identity-status-dot]').hasClass('top-0');
        assert.dom('[data-test-resource-identity-status-dot]').hasClass('-ml-1');
        assert.dom('[data-test-resource-identity-status-dot]').hasClass('-mt-1');
        assert.dom('[data-test-resource-identity-status-dot]').hasClass('text-green-500');
        assert.dom('[data-test-resource-identity-status-dot]').doesNotHaveClass('bg-green-500');
        assert.dom('.truncate.text-sm.font-semibold').doesNotExist();
        assert.dom('.truncate.text-sm.leading-4').exists();
        assert.dom('button').includesText('Truck 104');
        assert.notOk(this.element.textContent.includes('Name'));
        assert.dom('button').includesText('vehicle_123');
        assert.dom('button').includesText('ABC-123');
        assert.dom('button').includesText('Available');
        assert.dom('[data-test-resource-identity-status-dot]').hasClass('text-green-500');
    });

    test('it invokes the configured action when clicked', async function (assert) {
        assert.expect(2);

        this.set('row', { name: 'Driver One', public_id: 'driver_1' });
        this.set('column', {
            labelPath: 'name',
            identifierPath: 'public_id',
            action: (row) => {
                assert.strictEqual(row, this.row);
            },
        });
        this.set('onClick', (row) => {
            assert.strictEqual(row, this.row);
        });

        await render(hbs`<Table::Cell::ResourceIdentity @row={{this.row}} @column={{this.column}} @onClick={{this.onClick}} />`);
        await click('button');
    });

    test('it supports formatter callbacks and status tone maps', async function (assert) {
        this.set('row', {
            name: 'Oil Filter',
            sku: 'FLT-1',
            quantity_on_hand: 2,
            stock_state: 'low_stock',
        });
        this.set('column', {
            labelPath: 'name',
            identifierPath: 'sku',
            statusPath: 'stock_state',
            statusToneMap: {
                low_stock: 'text-yellow-500',
            },
            metaPaths: [
                {
                    path: 'quantity_on_hand',
                    formatter: (quantity) => `${quantity} on hand`,
                },
            ],
        });

        await render(hbs`<Table::Cell::ResourceIdentity @row={{this.row}} @column={{this.column}} />`);

        assert.dom('button').includesText('Oil Filter');
        assert.dom('button').includesText('FLT-1');
        assert.dom('button').includesText('2 on hand');
        assert.dom('button').includesText('Low Stock');
        assert.dom('[data-test-resource-identity-status-dot]').hasClass('text-yellow-500');
    });

    test('it renders badge-style metadata and compact status badges', async function (assert) {
        this.set('row', {
            name: 'Driver One',
            phone: '+1 555 0100',
            vehicle_name: 'Van 12',
            status: 'available',
        });
        this.set('column', {
            labelPath: 'name',
            statusPath: 'status',
            showStatusBadge: true,
            statusBadgeSize: 'xxs',
            metaPaths: [
                {
                    path: 'phone',
                    icon: 'phone',
                    style: 'badge',
                },
                {
                    path: 'vehicle_name',
                    icon: 'car',
                    style: 'badge',
                },
            ],
        });

        await render(hbs`<Table::Cell::ResourceIdentity @row={{this.row}} @column={{this.column}} />`);

        assert.dom('[data-test-resource-identity-meta-badge]').exists({ count: 2 });
        assert.dom('[data-test-resource-identity-meta-badge]').includesText('+1 555 0100');
        assert.dom('[data-test-resource-identity-meta-badge]').includesText('Van 12');
        assert.dom('[data-test-resource-identity-status-badge]').exists();
        assert.dom('[data-test-resource-identity-status-badge]').hasClass('status-badge-xxs');
    });

    test('it supports fully rounded images', async function (assert) {
        this.set('row', {
            name: 'Driver One',
            status: 'available',
            online: true,
        });
        this.set('column', {
            labelPath: 'name',
            statusPath: 'status',
            onlinePath: 'online',
            imageRounded: true,
        });

        await render(hbs`<Table::Cell::ResourceIdentity @row={{this.row}} @column={{this.column}} />`);

        assert.dom('[data-test-resource-identity-image]').hasClass('rounded-full');
        assert.dom('[data-test-resource-identity-status-dot]').hasClass('left-0');
        assert.dom('[data-test-resource-identity-status-dot]').hasClass('top-0');
        assert.dom('[data-test-resource-identity-status-dot]').hasClass('-ml-1');
        assert.dom('[data-test-resource-identity-status-dot]').hasClass('-mt-1');
    });
});
