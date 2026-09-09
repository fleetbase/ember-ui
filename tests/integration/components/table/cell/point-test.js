import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, settled, waitUntil } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function point(longitude, latitude) {
    return { type: 'Point', coordinates: [longitude, latitude] };
}

module('Integration | Component | table/cell/point', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the coordinates as "latitude longitude"', async function (assert) {
        this.set('row', { location: point(4.9041, 52.3676) });
        this.set('column', { valuePath: 'location' });

        await render(hbs`<Table::Cell::Point @row={{this.row}} @column={{this.column}} />`);
        await waitUntil(() => this.element.textContent.trim() !== '');

        assert.dom('span').hasText('52.3676 4.9041', 'the coordinate pair is flipped into lat/lng display order');
    });

    test('it resolves a nested value path', async function (assert) {
        this.set('row', { place: { position: point(1, 2) } });
        this.set('column', { valuePath: 'place.position' });

        await render(hbs`<Table::Cell::Point @row={{this.row}} @column={{this.column}} />`);
        await waitUntil(() => this.element.textContent.trim() !== '');

        assert.dom('span').hasText('2 1');
    });

    test('it renders empty when the column has no value path', async function (assert) {
        this.set('row', { location: point(1, 2) });
        this.set('column', {});

        await render(hbs`<Table::Cell::Point @row={{this.row}} @column={{this.column}} />`);

        assert.dom('span').hasText('');
    });

    test('it renders empty and does not throw when no arguments are supplied at all', async function (assert) {
        await render(hbs`<Table::Cell::Point />`);

        assert.dom('span').exists('it still renders the non-clickable branch');
        assert.dom('span').hasText('', 'a missing column resolves to no display value rather than an async TypeError');
    });

    test('it renders empty when the value at the path is not a point', async function (assert) {
        this.set('column', { valuePath: 'location' });

        for (const value of [null, undefined, 'not a point', 42, {}, { coordinates: 'nope' }]) {
            this.set('row', { location: value });

            await render(hbs`<Table::Cell::Point @row={{this.row}} @column={{this.column}} />`);

            assert.dom('span').hasText('', `${JSON.stringify(value)} is rejected`);
        }
    });

    test('it renders a span, not a link, when the column has no handlers', async function (assert) {
        this.set('row', { location: point(1, 2) });
        this.set('column', { valuePath: 'location' });

        await render(hbs`<Table::Cell::Point @row={{this.row}} @column={{this.column}} />`);

        assert.dom('a').doesNotExist('nothing is clickable without a handler');
        assert.dom('span').exists();
    });

    test('it renders a link when the column supplies onClick', async function (assert) {
        this.set('row', { location: point(1, 2) });
        this.set('column', { valuePath: 'location', onClick: () => {} });

        await render(hbs`<Table::Cell::Point @row={{this.row}} @column={{this.column}} />`);

        assert.dom('a').exists();
        assert.dom('span').doesNotExist();
    });

    test('it renders a link when the column supplies action', async function (assert) {
        this.set('column', { action: () => {} });

        await render(hbs`<Table::Cell::Point @column={{this.column}} />`);

        assert.dom('a').exists();
    });

    test('it applies the column class name to either element', async function (assert) {
        this.set('column', { className: 'text-red-500' });
        await render(hbs`<Table::Cell::Point @column={{this.column}} />`);
        assert.dom('span').hasClass('text-red-500');

        this.set('column', { className: 'text-blue-500', onClick: () => {} });
        await render(hbs`<Table::Cell::Point @column={{this.column}} />`);
        assert.dom('a').hasClass('text-blue-500');
    });

    test('clicking invokes onClick with the row', async function (assert) {
        const calls = [];
        this.set('row', { id: 'row-1' });
        this.set('column', { onClick: (row) => calls.push(row) });

        await render(hbs`<Table::Cell::Point @row={{this.row}} @column={{this.column}} />`);
        await click('a');

        assert.deepEqual(calls, [this.row], 'onClick receives the row');
    });

    test('clicking invokes action with the row', async function (assert) {
        const calls = [];
        this.set('row', { id: 'row-1' });
        this.set('column', { action: (row) => calls.push(row) });

        await render(hbs`<Table::Cell::Point @row={{this.row}} @column={{this.column}} />`);
        await click('a');

        assert.deepEqual(calls, [this.row]);
    });

    test('clicking invokes both handlers when both are supplied', async function (assert) {
        const calls = [];
        this.set('row', { id: 'row-1' });
        this.set('column', { onClick: () => calls.push('onClick'), action: () => calls.push('action') });

        await render(hbs`<Table::Cell::Point @row={{this.row}} @column={{this.column}} />`);
        await click('a');

        assert.deepEqual(calls, ['onClick', 'action'], 'both fire, onClick first');
    });

    test('it survives being destroyed before the deferred lookup runs', async function (assert) {
        this.set('show', true);
        this.set('row', { location: point(1, 2) });
        this.set('column', { valuePath: 'location' });

        await render(hbs`
            {{#if this.show}}
                <Table::Cell::Point @row={{this.row}} @column={{this.column}} />
            {{/if}}
        `);

        // Tear down well inside the 50ms delay.
        this.set('show', false);
        await settled();

        assert.dom('span').doesNotExist('the component is gone and its pending timer was cancelled');
    });
});
