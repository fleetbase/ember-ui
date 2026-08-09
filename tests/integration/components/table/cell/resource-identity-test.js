import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { click, render, findAll } from '@ember/test-helpers';
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
        // DEFECT (see DEFECTS.md #108): the trigger hard-codes `py-0.5` with no argument to switch
        // it off, so the "compact" identity is never actually compact. Pinned as-is.
        assert.dom('button').hasClass('py-0.5');
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

        // assert.dom(selector) always targets the FIRST match, so each badge has to be
        // selected individually.
        const badges = findAll('[data-test-resource-identity-meta-badge]');
        assert.strictEqual(badges.length, 2);
        assert.dom(badges[0]).includesText('+1 555 0100');
        assert.dom(badges[1]).includesText('Van 12');
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

    // Nearly every option in this cell accepts either a path, a literal or a callback. The
    // callback forms are what the path-driven tests above never exercise.
    module('callback and literal column options', function () {
        test('a labelFormatter takes precedence over every path', async function (assert) {
            this.set('row', { first_name: 'Ada', last_name: 'Lovelace' });
            this.set('column', {
                labelPath: 'first_name',
                labelFormatter: (row) => `${row.first_name} ${row.last_name}`,
            });

            await render(hbs`<Table::Cell::ResourceIdentity @row={{this.row}} @column={{this.column}} />`);

            assert.dom('button').includesText('Ada Lovelace', 'the formatter is asked, not the path');
        });

        test('a literal labelValue is used as given', async function (assert) {
            this.set('row', { name: 'ignored' });
            this.set('column', { labelPath: 'name', labelValue: 'Fixed Label' });

            await render(hbs`<Table::Cell::ResourceIdentity @row={{this.row}} @column={{this.column}} />`);

            assert.dom('button').includesText('Fixed Label');
            assert.dom('button').doesNotIncludeText('ignored');
        });

        test('a labelValue callback is invoked with the row', async function (assert) {
            this.set('row', { name: 'Truck 104' });
            this.set('column', { labelValue: (row) => row.name.toUpperCase() });

            await render(hbs`<Table::Cell::ResourceIdentity @row={{this.row}} @column={{this.column}} />`);

            assert.dom('button').includesText('TRUCK 104');
        });

        test('a labelPath given as a function is called rather than resolved', async function (assert) {
            this.set('row', { parts: ['Van', '12'] });
            this.set('column', { labelPath: (row) => row.parts.join(' ') });

            await render(hbs`<Table::Cell::ResourceIdentity @row={{this.row}} @column={{this.column}} />`);

            assert.dom('button').includesText('Van 12');
        });

        test('literal identifier, status and altText values bypass their paths', async function (assert) {
            this.set('row', { public_id: 'ignored_id', state: 'ignored_state' });
            this.set('column', {
                labelValue: 'Resource',
                identifierPath: 'public_id',
                identifier: 'literal_id',
                statusPath: 'state',
                status: 'available',
                altText: 'A literal alt',
                mediaUrl: 'https://example.com/literal.png',
            });

            await render(hbs`<Table::Cell::ResourceIdentity @row={{this.row}} @column={{this.column}} />`);

            assert.dom('button').includesText('literal_id');
            assert.dom('button').doesNotIncludeText('ignored_id');
            assert.dom('button').includesText('Available');
            assert.dom('[data-test-resource-identity-image]').hasAttribute('src', 'https://example.com/literal.png');
            assert.dom('[data-test-resource-identity-image]').hasAttribute('alt', 'A literal alt');
        });

        test('a statusFormatter renames the status and a statusToneClass callback colours it', async function (assert) {
            this.set('row', { name: 'Truck 104', state: 'in_service' });
            this.set('column', {
                labelPath: 'name',
                statusPath: 'state',
                statusFormatter: (status) => `State: ${status}`,
                statusToneClass: (value) => (value === 'in_service' ? 'text-blue-400' : 'text-gray-400'),
            });

            await render(hbs`<Table::Cell::ResourceIdentity @row={{this.row}} @column={{this.column}} />`);

            // The template humanises whatever the formatter returns, so `in_service` still comes
            // back out title-cased.
            assert.dom('button').includesText('State: In Service');
            assert.dom('[data-test-resource-identity-status-dot]').hasClass('text-blue-400');
        });

        test('a false online flag is toned as offline', async function (assert) {
            this.set('row', { name: 'Driver One', online: false, status: 'available' });
            this.set('column', { labelPath: 'name', statusPath: 'status', onlinePath: 'online' });

            await render(hbs`<Table::Cell::ResourceIdentity @row={{this.row}} @column={{this.column}} />`);

            assert.dom('[data-test-resource-identity-status-dot]').hasClass('text-yellow-200', 'a boolean online value picks the boolean tones');
            assert.dom('[data-test-resource-identity-status-dot]').doesNotHaveClass('text-green-500');
        });

        test('an explicit imageRoundedClass wins over the imageRounded flag', async function (assert) {
            this.set('row', { name: 'Driver One' });
            this.set('column', { labelPath: 'name', imageRounded: true, imageRoundedClass: 'rounded-none' });

            await render(hbs`<Table::Cell::ResourceIdentity @row={{this.row}} @column={{this.column}} />`);

            assert.dom('[data-test-resource-identity-image]').hasClass('rounded-none');
            assert.dom('[data-test-resource-identity-image]').doesNotHaveClass('rounded-full');
        });

        test('a column onClick handler is called alongside the argument handler', async function (assert) {
            const calls = [];
            this.set('row', { name: 'Driver One' });
            this.set('column', { labelPath: 'name', onClick: () => calls.push('column') });
            this.set('onClick', () => calls.push('argument'));

            await render(hbs`<Table::Cell::ResourceIdentity @row={{this.row}} @column={{this.column}} @onClick={{this.onClick}} />`);
            await click('button');

            assert.deepEqual(calls, ['argument', 'column'], 'both handlers run, the argument first');
        });

        test('it falls back to the plain @value with no column at all', async function (assert) {
            this.set('row', { name: 'Driver One' });

            await render(hbs`<Table::Cell::ResourceIdentity @row={{this.row}} @value="Just a value" />`);

            assert.dom('.table-cell-resource-identity').exists('an absent column is treated as an empty one');
            assert.dom('button').includesText('Just a value');
        });
    });

    module('metadata normalisation', function () {
        test('a metaPath function may return either a descriptor or a bare value', async function (assert) {
            this.set('row', { name: 'Truck 104', plate: 'ABC-123', mileage: 90210 });
            this.set('column', {
                labelPath: 'name',
                metaPaths: [(row) => ({ value: `Plate ${row.plate}` }), (row) => `${row.mileage} miles`],
            });

            await render(hbs`<Table::Cell::ResourceIdentity @row={{this.row}} @column={{this.column}} />`);

            assert.dom('button').includesText('Plate ABC-123', 'a descriptor is used as-is');
            assert.dom('button').includesText('90210 miles', 'a bare value is wrapped into one');
        });

        test('a descriptor may compute its own value', async function (assert) {
            this.set('row', { name: 'Truck 104', quantity: 4 });
            this.set('column', {
                labelPath: 'name',
                metaPaths: [{ value: (row) => `${row.quantity} in stock` }],
            });

            await render(hbs`<Table::Cell::ResourceIdentity @row={{this.row}} @column={{this.column}} />`);

            assert.dom('button').includesText('4 in stock');
        });

        test('an unusable metaPath entry is dropped rather than rendered', async function (assert) {
            this.set('row', { name: 'Truck 104', plate: 'ABC-123' });
            this.set('column', { labelPath: 'name', metaPaths: [42, null, 'plate'] });

            await render(hbs`<Table::Cell::ResourceIdentity @row={{this.row}} @column={{this.column}} />`);

            assert.dom('button').includesText('ABC-123', 'the usable entry still renders');
            assert.dom('button').doesNotIncludeText('42', 'the unusable ones are discarded');
        });

        test('duplicate metadata values are shown once', async function (assert) {
            this.set('row', { name: 'Truck 104', plate: 'ABC-123', registration: 'ABC-123' });
            this.set('column', { labelPath: 'name', metaPaths: ['plate', 'registration'] });

            await render(hbs`<Table::Cell::ResourceIdentity @row={{this.row}} @column={{this.column}} />`);

            const shown = this.element.textContent.match(/ABC-123/g) ?? [];
            assert.strictEqual(shown.length, 1, 'the repeated value is de-duplicated');
        });
    });
});
