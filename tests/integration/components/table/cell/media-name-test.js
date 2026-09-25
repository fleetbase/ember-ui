import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | table/cell/media-name', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the row photo_url by default', async function (assert) {
        this.set('row', { photo_url: '/img/default.png' });
        this.set('column', {});

        await render(hbs`<Table::Cell::MediaName @row={{this.row}} @column={{this.column}} />`);

        assert.dom('img').hasAttribute('src', '/img/default.png');
    });

    test('a column mediaPath overrides the default path', async function (assert) {
        this.set('row', { photo_url: '/img/default.png', avatar: '/img/avatar.png' });
        this.set('column', { mediaPath: 'avatar' });

        await render(hbs`<Table::Cell::MediaName @row={{this.row}} @column={{this.column}} />`);

        assert.dom('img').hasAttribute('src', '/img/avatar.png');
    });

    test('a column photoPath wins over mediaPath', async function (assert) {
        this.set('row', { avatar: '/img/avatar.png', photo: '/img/photo.png' });
        this.set('column', { mediaPath: 'avatar', photoPath: 'photo' });

        await render(hbs`<Table::Cell::MediaName @row={{this.row}} @column={{this.column}} />`);

        assert.dom('img').hasAttribute('src', '/img/photo.png', 'photoPath is applied last and therefore wins');
    });

    test('it resolves a nested media path', async function (assert) {
        this.set('row', { driver: { photo_url: '/img/nested.png' } });
        this.set('column', { mediaPath: 'driver.photo_url' });

        await render(hbs`<Table::Cell::MediaName @row={{this.row}} @column={{this.column}} />`);

        assert.dom('img').hasAttribute('src', '/img/nested.png');
    });

    test('it ignores a non-string mediaPath or photoPath', async function (assert) {
        this.set('row', { photo_url: '/img/default.png' });
        this.set('column', { mediaPath: 42, photoPath: null });

        await render(hbs`<Table::Cell::MediaName @row={{this.row}} @column={{this.column}} />`);

        assert.dom('img').hasAttribute('src', '/img/default.png', 'it falls back to photo_url');
    });

    test('alt text defaults to an empty string', async function (assert) {
        this.set('row', { photo_url: '/img/a.png' });
        this.set('column', {});

        await render(hbs`<Table::Cell::MediaName @row={{this.row}} @column={{this.column}} />`);

        assert.dom('img').hasAttribute('alt', '');
    });

    test('a literal column altText is used verbatim', async function (assert) {
        this.set('row', { photo_url: '/img/a.png' });
        this.set('column', { altText: 'Profile photo' });

        await render(hbs`<Table::Cell::MediaName @row={{this.row}} @column={{this.column}} />`);

        assert.dom('img').hasAttribute('alt', 'Profile photo');
    });

    test('an altTextPath is resolved against the row', async function (assert) {
        this.set('row', { photo_url: '/img/a.png', name: 'Ada Lovelace' });
        this.set('column', { altTextPath: 'name' });

        await render(hbs`<Table::Cell::MediaName @row={{this.row}} @column={{this.column}} />`);

        assert.dom('img').hasAttribute('alt', 'Ada Lovelace');
    });

    test('a literal altText wins over altTextPath', async function (assert) {
        this.set('row', { photo_url: '/img/a.png', name: 'Ada' });
        this.set('column', { altText: 'Literal', altTextPath: 'name' });

        await render(hbs`<Table::Cell::MediaName @row={{this.row}} @column={{this.column}} />`);

        assert.dom('img').hasAttribute('alt', 'Literal');
    });

    test('it renders the value when no block is supplied', async function (assert) {
        this.set('row', { photo_url: '/img/a.png' });
        this.set('column', {});

        await render(hbs`<Table::Cell::MediaName @row={{this.row}} @column={{this.column}} @value="Ada Lovelace" />`);

        assert.dom('a').containsText('Ada Lovelace');
    });

    test('it prefers block content over the value', async function (assert) {
        this.set('row', { photo_url: '/img/a.png' });
        this.set('column', {});

        await render(hbs`
            <Table::Cell::MediaName @row={{this.row}} @column={{this.column}} @value="Ignored">
                Block wins
            </Table::Cell::MediaName>
        `);

        assert.dom('a').containsText('Block wins');
        assert.dom('a').doesNotContainText('Ignored');
    });

    test('clicking fans the event out to onClick, column.onClick and column.action', async function (assert) {
        const calls = [];
        this.set('row', { photo_url: '/img/a.png', id: 'row-1' });
        this.set('column', {
            onClick: (row) => calls.push(['column.onClick', row]),
            action: (row) => calls.push(['column.action', row]),
        });
        this.set('onClick', (row) => calls.push(['arg.onClick', row]));

        await render(hbs`<Table::Cell::MediaName @row={{this.row}} @column={{this.column}} @onClick={{this.onClick}} />`);
        await click('a');

        assert.deepEqual(
            calls.map(([name]) => name),
            ['arg.onClick', 'column.onClick', 'column.action'],
            'all three handlers fire, in declaration order'
        );
        assert.strictEqual(calls[0][1], this.row, 'each handler receives the row');
    });

    test('clicking with no handlers does not throw', async function (assert) {
        this.set('row', { photo_url: '/img/a.png' });
        this.set('column', {});

        await render(hbs`<Table::Cell::MediaName @row={{this.row}} @column={{this.column}} />`);
        await click('a');

        assert.dom('a').exists('the cell survives a click with nothing wired up');
    });

    test('it shows the online indicator only when the column asks for it', async function (assert) {
        this.set('row', { photo_url: '/img/a.png', online: true });

        this.set('column', {});
        await render(hbs`<Table::Cell::MediaName @row={{this.row}} @column={{this.column}} />`);
        assert.dom('.fa-circle').doesNotExist('hidden by default');

        this.set('column', { showOnlineIndicator: true });
        await render(hbs`<Table::Cell::MediaName @row={{this.row}} @column={{this.column}} />`);
        assert.dom('.fa-circle').exists('shown when requested');
        assert.dom('.fa-circle').hasClass('text-green-500', 'an online row is green');
    });

    test('the online indicator turns amber when the row is offline', async function (assert) {
        this.set('row', { photo_url: '/img/a.png', online: false });
        this.set('column', { showOnlineIndicator: true });

        await render(hbs`<Table::Cell::MediaName @row={{this.row}} @column={{this.column}} />`);

        assert.dom('.fa-circle').hasClass('text-yellow-200');
    });

    test('the image spacing changes when the column reserves room for an online dot', async function (assert) {
        this.set('row', { photo_url: '/img/a.png' });

        this.set('column', {});
        await render(hbs`<Table::Cell::MediaName @row={{this.row}} @column={{this.column}} />`);
        assert.dom('img').hasClass('mr-2');

        this.set('column', { hasOnline: true });
        await render(hbs`<Table::Cell::MediaName @row={{this.row}} @column={{this.column}} />`);
        assert.dom('img').hasClass('mx-2');
    });
    // Every case above passes a row; the alt-text lookup guards against being asked without one.
    test('an alt text path with no row at all yields empty alt text', async function (assert) {
        this.set('column', { altTextPath: 'name' });

        await render(hbs`<Table::Cell::MediaName @column={{this.column}} />`);

        assert.dom('img').hasAttribute('alt', '', 'nothing to read the alt text from');
    });
});
