import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// VehicleName subclasses MediaName, so these tests focus on the behaviour it
// inherits being wired to the vehicle template, plus its own template branches.
module('Integration | Component | table/cell/vehicle-name', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the row photo and the value', async function (assert) {
        this.set('row', { id: 'v-1', photo_url: '/img/van.png' });
        this.set('column', {});

        await render(hbs`<Table::Cell::VehicleName @row={{this.row}} @column={{this.column}} @value="Transit Van" />`);

        assert.dom('img').hasAttribute('src', '/img/van.png');
        assert.dom('a').containsText('Transit Van');
    });

    test('it tags the image with the row id for targeting', async function (assert) {
        this.set('row', { id: 'v-42', photo_url: '/img/van.png' });
        this.set('column', {});

        await render(hbs`<Table::Cell::VehicleName @row={{this.row}} @column={{this.column}} />`);

        assert.dom('img').hasAttribute('data-vehicle', 'v-42');
    });

    test('a column mediaPath overrides the default photo path', async function (assert) {
        this.set('row', { photo_url: '/img/default.png', avatar: '/img/custom.png' });
        this.set('column', { mediaPath: 'avatar' });

        await render(hbs`<Table::Cell::VehicleName @row={{this.row}} @column={{this.column}} />`);

        assert.dom('img').hasAttribute('src', '/img/custom.png');
    });

    test('alt text comes from the column altText', async function (assert) {
        this.set('row', { photo_url: '/img/van.png' });
        this.set('column', { altText: 'Delivery van' });

        await render(hbs`<Table::Cell::VehicleName @row={{this.row}} @column={{this.column}} />`);

        assert.dom('img').hasAttribute('alt', 'Delivery van');
    });

    test('alt text can be resolved from an altTextPath', async function (assert) {
        this.set('row', { photo_url: '/img/van.png', plate: 'AB-123' });
        this.set('column', { altTextPath: 'plate' });

        await render(hbs`<Table::Cell::VehicleName @row={{this.row}} @column={{this.column}} />`);

        assert.dom('img').hasAttribute('alt', 'AB-123');
    });

    test('block content replaces the value', async function (assert) {
        this.set('row', { photo_url: '/img/van.png' });
        this.set('column', {});

        await render(hbs`
            <Table::Cell::VehicleName @row={{this.row}} @column={{this.column}} @value="Ignored">
                <b data-test-block>Custom</b>
            </Table::Cell::VehicleName>
        `);

        assert.dom('[data-test-block]').hasText('Custom');
        assert.dom('a').doesNotContainText('Ignored');
    });

    test('clicking fans out to the column handlers', async function (assert) {
        const order = [];
        this.set('row', { id: 'v-1', photo_url: '/img/van.png' });
        this.set('column', {
            onClick: () => order.push('column.onClick'),
            action: () => order.push('column.action'),
        });
        this.set('onClick', () => order.push('arg.onClick'));

        await render(hbs`<Table::Cell::VehicleName @row={{this.row}} @column={{this.column}} @onClick={{this.onClick}} />`);
        await click('a');

        assert.deepEqual(order, ['arg.onClick', 'column.onClick', 'column.action']);
    });

    test('the online indicator only shows when the column asks for it', async function (assert) {
        this.set('row', { photo_url: '/img/van.png', online: true });

        this.set('column', {});
        await render(hbs`<Table::Cell::VehicleName @row={{this.row}} @column={{this.column}} />`);
        assert.dom('.fa-circle').doesNotExist();

        this.set('column', { showOnlineIndicator: true });
        assert.dom('.fa-circle').exists();
        assert.dom('.fa-circle').hasClass('text-green-500');
    });

    test('the online indicator is amber for an offline vehicle', async function (assert) {
        this.set('row', { photo_url: '/img/van.png', online: false });
        this.set('column', { showOnlineIndicator: true });

        await render(hbs`<Table::Cell::VehicleName @row={{this.row}} @column={{this.column}} />`);

        assert.dom('.fa-circle').hasClass('text-yellow-200');
    });

    test('image spacing reflects whether the column reserves room for the dot', async function (assert) {
        this.set('row', { photo_url: '/img/van.png' });

        this.set('column', {});
        await render(hbs`<Table::Cell::VehicleName @row={{this.row}} @column={{this.column}} />`);
        assert.dom('img').hasClass('mr-2');

        this.set('column', { hasOnline: true });
        assert.dom('img').hasClass('mx-2');
    });

    test('it renders with no arguments at all', async function (assert) {
        await render(hbs`<Table::Cell::VehicleName />`);

        assert.dom('img').exists('a bare cell still renders its image and link');
        assert.dom('a').exists();
    });
});
